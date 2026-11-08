// ==========================================
// 1. SISTEMA DE NOTIFICAÇÕES E ÁUDIO
// ==========================================

// Pede permissão ao navegador assim que a página carregar
function solicitarPermissaoNotificacao() {
  if ("Notification" in window && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
}

// Emite avisos sonoros sem precisar de arquivos externos de áudio
function tocarAlarme(frequencia = 520, tipo = 'sine', duracao = 0.4) {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = tipo;
    oscillator.frequency.setValueAtTime(frequencia, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duracao);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duracao);
  } catch (e) {
    console.error("Erro ao tocar áudio:", e);
  }
}

// Exibe a notificação no canto da tela
function enviarNotificacao(titulo, mensagem) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(titulo, { body: mensagem });
  }
}

// ==========================================
// 2. GERENCIAMENTO DE TAREFAS E CRONÔMETRO
// ==========================================

let tarefas = JSON.parse(localStorage.getItem('taskflow_tarefas')) || [];
let filtroAtual = 'Todas';

function salvarNoLocalStorage() {
  localStorage.setItem('taskflow_tarefas', JSON.stringify(tarefas));
}

// Adiciona uma nova tarefa
function agendarTarefa(titulo, horarioInicio, duracaoMinutos, pausaMinutos) {
  const novaTarefa = {
    id: Date.now(),
    titulo,
    horarioInicio,
    duracaoMinutos: parseInt(duracaoMinutos),
    pausaMinutos: parseInt(pausaMinutos),
    tempoDecorrido: 0, // em segundos
    status: 'Pendente', // 'Pendente', 'Em Andamento', 'Em Pausa', 'Concluído'
    notificadoInicio: false,
    notificadoFim: false
  };

  tarefas.push(novaTarefa);
  salvarNoLocalStorage();
  renderizarTarefas();
}

// Ações dos botões (Iniciar, Pausar, Concluir, Deletar)
function iniciarTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  tarefa.status = 'Em Andamento';
  tocarAlarme(660, 'triangle', 0.4);
  enviarNotificacao("🚀 Tarefa Iniciada", `Você começou: "${tarefa.titulo}"`);
  
  salvarNoLocalStorage();
  renderizarTarefas();
}

function pausarTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  tarefa.status = 'Em Pausa';
  tocarAlarme(350, 'sine', 0.2);
  setTimeout(() => tocarAlarme(280, 'sine', 0.3), 150);
  enviarNotificacao("⏸️ Tarefa Pausada", `Você pausou: "${tarefa.titulo}"`);

  salvarNoLocalStorage();
  renderizarTarefas();
}

function concluirTarefa(id) {
  const tarefa = tarefas.find(t => t.id === id);
  if (!tarefa) return;

  tarefa.status = 'Concluído';
  tocarAlarme(880, 'sine', 0.5);
  enviarNotificacao("✅ Tarefa Concluída!", `Parabéns por finalizar: "${tarefa.titulo}"`);

  salvarNoLocalStorage();
  renderizarTarefas();
}

function deletarTarefa(id) {
  tarefas = tarefas.filter(t => t.id !== id);
  salvarNoLocalStorage();
  renderizarTarefas();
}

// ==========================================
// 3. LOOP DE TEMPO REAL (CHECA HORÁRIOS E CRONÔMETRO)
// ==========================================

setInterval(() => {
  const agora = new Date();
  const horaAtual = agora.toTimeString().substring(0, 5); // Formato HH:MM

  tarefas.forEach(tarefa => {
    // 1. Notifica se chegou a hora de iniciar a tarefa agendada
    if (tarefa.horarioInicio === horaAtual && !tarefa.notificadoInicio && tarefa.status === 'Pendente') {
      tocarAlarme(660, 'triangle', 0.8);
      enviarNotificacao("📅 Hora da Tarefa!", `Está na hora de iniciar: "${tarefa.titulo}"`);
      tarefa.notificadoInicio = true;
      salvarNoLocalStorage();
    }

    // 2. Incrementa tempo se estiver em andamento
    if (tarefa.status === 'Em Andamento') {
      tarefa.tempoDecorrido++;

      const tempoTotalSegundos = (tarefa.duracaoMinutos + tarefa.pausaMinutos) * 60;
      
      // 3. Notifica quando o tempo previsto esgotar
      if (tarefa.tempoDecorrido >= tempoTotalSegundos && !tarefa.notificadoFim) {
        tocarAlarme(440, 'sine', 1.2);
        enviarNotificacao("⏰ Tempo Esgotado!", `O tempo planejado para "${tarefa.titulo}" acabou.`);
        tarefa.notificadoFim = true;
      }

      salvarNoLocalStorage();
      renderizarTarefas();
    }
  });

  // Atualiza relógio do topo da tela se houver o elemento
  const elRelogio = document.getElementById('relogio-topo');
  if (elRelogio) {
    elRelogio.innerText = agora.toLocaleTimeString('pt-BR');
  }
}, 1000);

// ==========================================
// 4. INICIALIZAÇÃO
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  solicitarPermissaoNotificacao();
  
  // Exemplo de ouvinte para o formulário de criar tarefa
  const formAgendar = document.getElementById('form-agendar');
  if (formAgendar) {
    formAgendar.addEventListener('submit', (e) => {
      e.preventDefault();
      const titulo = document.getElementById('input-titulo').value;
      const inicio = document.getElementById('input-inicio').value;
      const duracao = document.getElementById('input-duracao').value || 0;
      const pausa = document.getElementById('input-pausa').value || 0;

      agendarTarefa(titulo, inicio, duracao, pausa);
      formAgendar.reset();
    });
  }
});