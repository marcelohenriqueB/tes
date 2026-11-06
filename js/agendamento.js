(() => {
  const form = document.querySelector('#form-agendamento');
  if (!form) return;

  const data = form.elements.data;
  const horario = form.elements.horario;
  const status = document.querySelector('#status-agendamento');
  const botao = form.querySelector('button[type="submit"]');
  const hoje = new Date();
  hoje.setMinutes(hoje.getMinutes() - hoje.getTimezoneOffset());
  data.min = hoje.toISOString().slice(0, 10);

  const mostrarStatus = (mensagem, erro = false) => {
    status.textContent = mensagem;
    status.classList.toggle('is-erro', erro);
  };

  async function carregarHorarios() {
    horario.disabled = true;
    horario.innerHTML = '<option value="">Buscando horários...</option>';
    if (!data.value) {
      horario.innerHTML = '<option value="">Escolha primeiro uma data</option>';
      return;
    }
    try {
      const resposta = await fetch(`agendamento.php?data=${encodeURIComponent(data.value)}`, {
        headers: { Accept: 'application/json' }
      });
      if (!resposta.ok) throw new Error('indisponível');
      const resultado = await resposta.json();
      horario.innerHTML = '';
      if (!resultado.horarios || resultado.horarios.length === 0) {
        horario.innerHTML = '<option value="">Sem horários disponíveis</option>';
        mostrarStatus('Não há horários livres nessa data. Escolha outro dia.', true);
        return;
      }
      horario.append(new Option('Selecione um horário', ''));
      resultado.horarios.forEach((hora) => horario.append(new Option(hora, hora)));
      horario.disabled = false;
      mostrarStatus('Escolha um dos horários livres para continuar.');
    } catch (erro) {
      horario.innerHTML = '<option value="">Disponibilidade após publicação</option>';
      mostrarStatus('A consulta de disponibilidade e o agendamento ficam ativos depois que o site for publicado.', true);
    }
  }

  data.addEventListener('change', carregarHorarios);
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!form.reportValidity()) return;
    botao.disabled = true;
    mostrarStatus('Confirmando seu horário...');
    const dados = Object.fromEntries(new FormData(form).entries());
    try {
      const resposta = await fetch('agendamento.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(dados)
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || 'Não foi possível confirmar o agendamento.');
      const dataEscolhida = data.value;
      form.reset();
      data.min = hoje.toISOString().slice(0, 10);
      data.value = dataEscolhida;
      await carregarHorarios();
      mostrarStatus(resultado.mensagem, false);
    } catch (erro) {
      mostrarStatus(erro.message || 'Não foi possível acessar a agenda. Tente novamente após a publicação.', true);
    } finally {
      botao.disabled = false;
    }
  });
})();
