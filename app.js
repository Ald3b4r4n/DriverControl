// Configuração do Firebase com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyBhqaeMZ4sCCXIF_mknXVU6cm3FgH-VNfk",
  authDomain: "drivercontrol-f9af8.firebaseapp.com",
  projectId: "drivercontrol-f9af8",
  storageBucket: "drivercontrol-f9af8.appspot.com",
  messagingSenderId: "923692979527",
  appId: "1:923692979527:web:2c2e376e20b3f4805da862",
  measurementId: "G-3HVHX30V2H"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variáveis globais
let pieChart = null;
let lineChart = null;
let currentEditId = null;
let currentCollection = null;

// Elementos do DOM
const navBtns = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const saveEarningsBtn = document.getElementById('save-earnings');
const saveFuelBtn = document.getElementById('save-fuel');
const saveKmBtn = document.getElementById('save-km');
const updateChartsBtn = document.getElementById('update-charts');
const chartPeriodSelect = document.getElementById('chart-period');
const editModal = document.getElementById('edit-modal');
const modalForm = document.getElementById('modal-form');
const saveEditBtn = document.getElementById('save-edit');
const closeModal = document.querySelector('.close-modal');

// Inicialização do app
document.addEventListener('DOMContentLoaded', () => {
  // Event listeners
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  saveEarningsBtn.addEventListener('click', saveEarning);
  saveFuelBtn.addEventListener('click', saveFuel);
  saveKmBtn.addEventListener('click', saveKm);
  updateChartsBtn.addEventListener('click', loadChartsData);
  closeModal.addEventListener('click', () => editModal.style.display = 'none');
  saveEditBtn.addEventListener('click', saveEdit);

  // Fechar modal ao clicar fora
  window.addEventListener('click', (event) => {
    if (event.target === editModal) {
      editModal.style.display = 'none';
    }
  });

  // Carrega dados iniciais
  loadEarningsData();
  loadFuelData();
  loadKmData();
  loadChartsData();
});

// Funções de navegação
function switchTab(tabId) {
  // Atualiza botões de navegação
  navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  
  // Atualiza conteúdo das abas
  tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
  
  // Atualiza gráficos se for a aba correspondente
  if (tabId === 'graficos') {
    loadChartsData();
  }
}

// Funções de dados - Ganhos
function loadEarningsData() {
  const earningsTable = document.querySelector('#earnings-table tbody');
  earningsTable.innerHTML = '<tr><td colspan="4" style="text-align: center;">Carregando...</td></tr>';
  
  db.collection('earnings')
    .orderBy('date', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      earningsTable.innerHTML = '';
      
      if (snapshot.empty) {
        earningsTable.innerHTML = '<tr><td colspan="4" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(data.date.seconds * 1000).toLocaleDateString('pt-BR');
        
        const appCell = document.createElement('td');
        appCell.textContent = getAppName(data.app);
        
        const amountCell = document.createElement('td');
        const amountSpan = document.createElement('span');
        amountSpan.className = 'editable-value';
        amountSpan.textContent = `R$ ${data.amount.toFixed(2)}`;
        amountSpan.addEventListener('click', () => openEditModal(doc.id, 'earnings', {
          amount: data.amount,
          app: data.app
        }));
        amountCell.appendChild(amountSpan);
        
        const actionsCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remover';
        deleteBtn.className = 'btn-action';
        deleteBtn.addEventListener('click', () => deleteEarning(doc.id));
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(dateCell);
        row.appendChild(appCell);
        row.appendChild(amountCell);
        row.appendChild(actionsCell);
        
        earningsTable.appendChild(row);
      });
    })
    .catch(error => {
      earningsTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error('Erro ao carregar ganhos:', error);
    });
}

function saveEarning() {
  const app = document.getElementById('app-select').value;
  const amount = parseFloat(document.getElementById('earnings-amount').value);
  
  if (!amount || amount <= 0) {
    alert('Informe um valor válido');
    return;
  }
  
  saveEarningsBtn.disabled = true;
  saveEarningsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  
  db.collection('earnings').add({
    app: app,
    amount: amount,
    date: new Date()
  }).then(() => {
    document.getElementById('earnings-amount').value = '';
    loadEarningsData();
    loadChartsData();
    showToast('Ganho registrado com sucesso!', 'success');
  }).catch(error => {
    showToast('Erro ao salvar: ' + error.message, 'error');
  }).finally(() => {
    saveEarningsBtn.disabled = false;
    saveEarningsBtn.innerHTML = 'Salvar';
  });
}

function deleteEarning(id) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  
  db.collection('earnings').doc(id).delete()
    .then(() => {
      loadEarningsData();
      loadChartsData();
      showToast('Registro excluído com sucesso!', 'success');
    })
    .catch(error => {
      showToast('Erro ao excluir: ' + error.message, 'error');
    });
}

// Funções de dados - Combustível
function loadFuelData() {
  const fuelTable = document.querySelector('#fuel-table tbody');
  fuelTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';
  
  db.collection('fuel')
    .orderBy('date', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      fuelTable.innerHTML = '';
      
      if (snapshot.empty) {
        fuelTable.innerHTML = '<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(data.date.seconds * 1000).toLocaleDateString('pt-BR');
        
        const amountCell = document.createElement('td');
        const amountSpan = document.createElement('span');
        amountSpan.className = 'editable-value';
        amountSpan.textContent = `R$ ${data.amount.toFixed(2)}`;
        amountSpan.addEventListener('click', () => openEditModal(doc.id, 'fuel', {
          amount: data.amount,
          liters: data.liters
        }));
        amountCell.appendChild(amountSpan);
        
        const litersCell = document.createElement('td');
        litersCell.textContent = data.liters ? data.liters.toFixed(1) + ' L' : 'N/A';
        
        const priceCell = document.createElement('td');
        priceCell.textContent = data.liters ? `R$ ${(data.amount / data.liters).toFixed(3)}/L` : 'N/A';
        
        const actionsCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remover';
        deleteBtn.className = 'btn-action';
        deleteBtn.addEventListener('click', () => deleteFuel(doc.id));
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(dateCell);
        row.appendChild(amountCell);
        row.appendChild(litersCell);
        row.appendChild(priceCell);
        row.appendChild(actionsCell);
        
        fuelTable.appendChild(row);
      });
    })
    .catch(error => {
      fuelTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error('Erro ao carregar combustível:', error);
    });
}

function saveFuel() {
  const amount = parseFloat(document.getElementById('fuel-amount').value);
  const liters = parseFloat(document.getElementById('fuel-liters').value);
  
  if (!amount || amount <= 0) {
    alert('Informe um valor válido');
    return;
  }
  
  saveFuelBtn.disabled = true;
  saveFuelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  
  const fuelData = {
    amount: amount,
    date: new Date()
  };
  
  if (liters && liters > 0) {
    fuelData.liters = liters;
  }
  
  db.collection('fuel').add(fuelData)
    .then(() => {
      document.getElementById('fuel-amount').value = '';
      document.getElementById('fuel-liters').value = '';
      loadFuelData();
      loadChartsData();
      showToast('Abastecimento registrado com sucesso!', 'success');
    })
    .catch(error => {
      showToast('Erro ao salvar: ' + error.message, 'error');
    })
    .finally(() => {
      saveFuelBtn.disabled = false;
      saveFuelBtn.innerHTML = 'Salvar';
    });
}

function deleteFuel(id) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  
  db.collection('fuel').doc(id).delete()
    .then(() => {
      loadFuelData();
      loadChartsData();
      showToast('Registro excluído com sucesso!', 'success');
    })
    .catch(error => {
      showToast('Erro ao excluir: ' + error.message, 'error');
    });
}

// Funções de dados - Quilometragem
function loadKmData() {
  const kmTable = document.querySelector('#km-table tbody');
  kmTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';
  
  db.collection('kilometers')
    .orderBy('date', 'desc')
    .limit(10)
    .get()
    .then(snapshot => {
      kmTable.innerHTML = '';
      
      if (snapshot.empty) {
        kmTable.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        
        const dateCell = document.createElement('td');
        dateCell.textContent = new Date(data.date.seconds * 1000).toLocaleDateString('pt-BR');
        
        const kmInicialCell = document.createElement('td');
        kmInicialCell.textContent = data.kmInitial;
        
        const kmFinalCell = document.createElement('td');
        kmFinalCell.textContent = data.kmFinal;
        
        const totalKmCell = document.createElement('td');
        const totalKm = data.kmFinal - data.kmInitial;
        totalKmCell.textContent = `${totalKm} km`;
        
        const kmProfitCell = document.createElement('td');
        kmProfitCell.textContent = 'Calculando...';
        
        // Busca os ganhos do mesmo dia para calcular R$/km
        const sameDay = new Date(data.date.seconds * 1000);
        sameDay.setHours(0, 0, 0, 0);
        const nextDay = new Date(sameDay);
        nextDay.setDate(nextDay.getDate() + 1);
        
        db.collection('earnings')
          .where('date', '>=', sameDay)
          .where('date', '<', nextDay)
          .get()
          .then(earningsSnapshot => {
            let totalEarnings = 0;
            earningsSnapshot.forEach(earningDoc => {
              totalEarnings += earningDoc.data().amount;
            });
            
            const kmProfit = totalEarnings / totalKm;
            kmProfitCell.textContent = `R$ ${kmProfit.toFixed(2)}/km`;
          })
          .catch(error => {
            kmProfitCell.textContent = 'N/A';
          });
        
        const actionsCell = document.createElement('td');
        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar';
        editBtn.className = 'btn-action';
        editBtn.addEventListener('click', () => openEditModal(doc.id, 'kilometers', {
          kmInitial: data.kmInitial,
          kmFinal: data.kmFinal
        }));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Remover';
        deleteBtn.className = 'btn-action';
        deleteBtn.addEventListener('click', () => deleteKm(doc.id));
        
        actionsCell.appendChild(editBtn);
        actionsCell.appendChild(deleteBtn);
        
        row.appendChild(dateCell);
        row.appendChild(kmInicialCell);
        row.appendChild(kmFinalCell);
        row.appendChild(totalKmCell);
        row.appendChild(kmProfitCell);
        row.appendChild(actionsCell);
        
        kmTable.appendChild(row);
      });
    })
    .catch(error => {
      kmTable.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error('Erro ao carregar quilometragem:', error);
    });
}

function saveKm() {
  const kmInitial = parseInt(document.getElementById('km-inicial').value);
  const kmFinal = parseInt(document.getElementById('km-final').value);
  
  if (!kmInitial || kmInitial < 0 || !kmFinal || kmFinal <= kmInitial) {
    alert('Informe valores válidos (Km Final deve ser maior que Km Inicial)');
    return;
  }
  
  saveKmBtn.disabled = true;
  saveKmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  
  db.collection('kilometers').add({
    kmInitial: kmInitial,
    kmFinal: kmFinal,
    date: new Date()
  }).then(() => {
    document.getElementById('km-inicial').value = '';
    document.getElementById('km-final').value = '';
    loadKmData();
    loadChartsData();
    showToast('Quilometragem registrada com sucesso!', 'success');
  }).catch(error => {
    showToast('Erro ao salvar: ' + error.message, 'error');
  }).finally(() => {
    saveKmBtn.disabled = false;
    saveKmBtn.innerHTML = 'Salvar';
  });
}

function deleteKm(id) {
  if (!confirm('Tem certeza que deseja excluir este registro?')) return;
  
  db.collection('kilometers').doc(id).delete()
    .then(() => {
      loadKmData();
      loadChartsData();
      showToast('Registro excluído com sucesso!', 'success');
    })
    .catch(error => {
      showToast('Erro ao excluir: ' + error.message, 'error');
    });
}

// Funções de edição
function openEditModal(id, collection, data) {
  currentEditId = id;
  currentCollection = collection;
  modalForm.innerHTML = '';
  
  if (collection === 'earnings') {
    modalForm.innerHTML = `
      <div class="form-group">
        <select id="edit-app" class="full-width">
          <option value="99" ${data.app === '99' ? 'selected' : ''}>99</option>
          <option value="indrive" ${data.app === 'indrive' ? 'selected' : ''}>Indrive</option>
          <option value="iupe" ${data.app === 'iupe' ? 'selected' : ''}>IUPE</option>
          <option value="uber" ${data.app === 'uber' ? 'selected' : ''}>Uber</option>
          <option value="outros" ${data.app === 'outros' ? 'selected' : ''}>Outros</option>
        </select>
      </div>
      <div class="form-group">
        <input type="number" id="edit-amount" value="${data.amount}" step="0.01" class="full-width" placeholder="Valor (R$)">
      </div>
    `;
  } else if (collection === 'fuel') {
    modalForm.innerHTML = `
      <div class="form-group">
        <input type="number" id="edit-amount" value="${data.amount}" step="0.01" class="full-width" placeholder="Valor (R$)">
      </div>
      <div class="form-group">
        <input type="number" id="edit-liters" value="${data.liters || ''}" step="0.1" class="full-width" placeholder="Litros">
      </div>
    `;
  } else if (collection === 'kilometers') {
    modalForm.innerHTML = `
      <div class="form-group">
        <input type="number" id="edit-km-initial" value="${data.kmInitial}" class="full-width" placeholder="Km Inicial">
      </div>
      <div class="form-group">
        <input type="number" id="edit-km-final" value="${data.kmFinal}" class="full-width" placeholder="Km Final">
      </div>
    `;
  }
  
  editModal.style.display = 'block';
}

function saveEdit() {
  if (!currentEditId || !currentCollection) return;
  
  const updateData = {};
  
  if (currentCollection === 'earnings') {
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const app = document.getElementById('edit-app').value;
    
    if (!amount || amount <= 0) {
      showToast('Informe um valor válido', 'error');
      return;
    }
    
    updateData.amount = amount;
    updateData.app = app;
  } else if (currentCollection === 'fuel') {
    const amount = parseFloat(document.getElementById('edit-amount').value);
    const liters = parseFloat(document.getElementById('edit-liters').value);
    
    if (!amount || amount <= 0) {
      showToast('Informe um valor válido', 'error');
      return;
    }
    
    updateData.amount = amount;
    if (liters && liters > 0) {
      updateData.liters = liters;
    }
  } else if (currentCollection === 'kilometers') {
    const kmInitial = parseInt(document.getElementById('edit-km-initial').value);
    const kmFinal = parseInt(document.getElementById('edit-km-final').value);
    
    if (!kmInitial || kmInitial < 0 || !kmFinal || kmFinal <= kmInitial) {
      showToast('Informe valores válidos (Km Final deve ser maior que Km Inicial)', 'error');
      return;
    }
    
    updateData.kmInitial = kmInitial;
    updateData.kmFinal = kmFinal;
  }
  
  saveEditBtn.disabled = true;
  saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
  
  db.collection(currentCollection).doc(currentEditId).update(updateData)
    .then(() => {
      showToast('Registro atualizado com sucesso!', 'success');
      editModal.style.display = 'none';
      
      // Atualiza a tabela correspondente
      if (currentCollection === 'earnings') {
        loadEarningsData();
      } else if (currentCollection === 'fuel') {
        loadFuelData();
      } else if (currentCollection === 'kilometers') {
        loadKmData();
      }
      
      // Atualiza gráficos
      loadChartsData();
    })
    .catch(error => {
      showToast('Erro ao atualizar: ' + error.message, 'error');
    })
    .finally(() => {
      saveEditBtn.disabled = false;
      saveEditBtn.innerHTML = 'Salvar';
    });
}

// Funções de gráficos
function loadChartsData() {
  const period = chartPeriodSelect.value;
  let startDate = new Date();
  
  switch(period) {
    case 'diario':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'semanal':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'mensal':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'anual':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  updateChartsBtn.disabled = true;
  updateChartsBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
  
  // Busca dados
  Promise.all([
    db.collection('earnings')
      .where('date', '>=', startDate)
      .get(),
    db.collection('fuel')
      .where('date', '>=', startDate)
      .get(),
    db.collection('kilometers')
      .where('date', '>=', startDate)
      .get()
  ]).then(([earningsSnapshot, fuelSnapshot, kmSnapshot]) => {
    // Processa ganhos por aplicativo
    const earningsByApp = {
      'uber': 0,
      '99': 0,
      'indrive': 0,
      'iupe': 0,
      'outros': 0
    };
    
    let totalEarnings = 0;
    earningsSnapshot.forEach(doc => {
      const data = doc.data();
      earningsByApp[data.app] += data.amount;
      totalEarnings += data.amount;
    });
    
    // Processa gastos com combustível
    let totalFuel = 0;
    fuelSnapshot.forEach(doc => {
      totalFuel += doc.data().amount;
    });
    
    // Processa quilometragem
    let totalKm = 0;
    kmSnapshot.forEach(doc => {
      const data = doc.data();
      totalKm += (data.kmFinal - data.kmInitial);
    });
    
    // Calcula R$/km
    const kmProfit = totalKm > 0 ? (totalEarnings / totalKm) : 0;
    
    // Atualiza cards de resumo
    document.getElementById('total-earnings').textContent = `R$ ${totalEarnings.toFixed(2)}`;
    document.getElementById('total-fuel').textContent = `R$ ${totalFuel.toFixed(2)}`;
    document.getElementById('total-km').textContent = `${totalKm} km`;
    document.getElementById('total-profit').textContent = `R$ ${(totalEarnings - totalFuel).toFixed(2)}`;
    document.getElementById('km-profit').textContent = `R$ ${kmProfit.toFixed(2)}/km`;
    
    // Prepara dados para gráfico de pizza
    const pieLabels = [];
    const pieData = [];
    const pieColors = ['#4361ee', '#3f37c9', '#4895ef', '#4cc9f0', '#f72585'];
    
    for (const [app, amount] of Object.entries(earningsByApp)) {
      if (amount > 0) {
        pieLabels.push(getAppName(app));
        pieData.push(amount);
      }
    }
    
    // Atualiza/Cria gráfico de pizza
    const pieCtx = document.getElementById('pie-chart').getContext('2d');
    if (pieChart) {
      pieChart.data.labels = pieLabels;
      pieChart.data.datasets[0].data = pieData;
      pieChart.update();
    } else {
      pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
          labels: pieLabels,
          datasets: [{
            data: pieData,
            backgroundColor: pieColors,
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: {
              position: 'bottom',
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: R$ ${value.toFixed(2)} (${percentage}%)`;
                }
              }
            }
          }
        }
      });
    }
    
    // Prepara dados para gráfico de linhas (últimos 7 dias)
    const lineLabels = [];
    const lineEarnings = [];
    const lineFuel = [];
    const lineProfit = [];
    const lineKm = [];
    const lineKmProfit = [];
    
    const daysToShow = period === 'diario' ? 24 : period === 'semanal' ? 7 : period === 'mensal' ? 30 : 12;
    const isDaily = period === 'diario' || period === 'semanal';
    
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      if (isDaily) {
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        lineLabels.push(date.toLocaleDateString('pt-BR', { weekday: 'short' }));
      } else if (period === 'mensal') {
        date.setDate(1);
        date.setMonth(date.getMonth() - i);
        lineLabels.push(date.toLocaleDateString('pt-BR', { month: 'short' }));
      } else {
        date.setMonth(0);
        date.setFullYear(date.getFullYear() - i);
        lineLabels.push(date.getFullYear());
      }
      
      // Calcula ganhos do período
      let periodEarnings = 0;
      earningsSnapshot.forEach(doc => {
        const docDate = new Date(doc.data().date.seconds * 1000);
        if (isSamePeriod(docDate, date, period)) {
          periodEarnings += doc.data().amount;
        }
      });
      lineEarnings.push(periodEarnings);
      
      // Calcula combustível do período
      let periodFuel = 0;
      fuelSnapshot.forEach(doc => {
        const docDate = new Date(doc.data().date.seconds * 1000);
        if (isSamePeriod(docDate, date, period)) {
          periodFuel += doc.data().amount;
        }
      });
      lineFuel.push(periodFuel);
      
      // Calcula km do período
      let periodKm = 0;
      kmSnapshot.forEach(doc => {
        const data = doc.data();
        const docDate = new Date(data.date.seconds * 1000);
        if (isSamePeriod(docDate, date, period)) {
          periodKm += (data.kmFinal - data.kmInitial);
        }
      });
      lineKm.push(periodKm);
      
      // Calcula lucro e R$/km
      lineProfit.push(periodEarnings - periodFuel);
      lineKmProfit.push(periodKm > 0 ? (periodEarnings / periodKm) : 0);
    }
    
    // Atualiza/Cria gráfico de linhas
    const lineCtx = document.getElementById('line-chart').getContext('2d');
    if (lineChart) {
      lineChart.data.labels = lineLabels;
      lineChart.data.datasets[0].data = lineEarnings;
      lineChart.data.datasets[1].data = lineFuel;
      lineChart.data.datasets[2].data = lineProfit;
      lineChart.update();
    } else {
      lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
          labels: lineLabels,
          datasets: [
            {
              label: 'Ganhos',
              data: lineEarnings,
              borderColor: '#4361ee',
              backgroundColor: 'rgba(67, 97, 238, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Combustível',
              data: lineFuel,
              borderColor: '#f72585',
              backgroundColor: 'rgba(247, 37, 133, 0.1)',
              tension: 0.4,
              fill: true
            },
            {
              label: 'Lucro',
              data: lineProfit,
              borderColor: '#4cc9f0',
              backgroundColor: 'rgba(76, 201, 240, 0.1)',
              tension: 0.4,
              fill: true,
              borderDash: [5, 5]
            }
          ]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(value) {
                  return 'R$ ' + value;
                }
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: function(context) {
                  let label = context.dataset.label || '';
                  if (label) {
                    label += ': ';
                  }
                  label += 'R$ ' + context.raw.toFixed(2);
                  return label;
                }
              }
            }
          }
        }
      });
    }
  }).catch(error => {
    console.error('Erro ao carregar dados para gráficos:', error);
    showToast('Erro ao carregar dados para gráficos', 'error');
  }).finally(() => {
    updateChartsBtn.disabled = false;
    updateChartsBtn.innerHTML = 'Atualizar';
  });
}

// Funções auxiliares
function getAppName(appCode) {
  const apps = {
    'uber': 'Uber',
    '99': '99',
    'indrive': 'Indrive',
    'iupe': 'IUPE',
    'outros': 'Outros'
  };
  return apps[appCode] || appCode;
}

function isSamePeriod(date1, date2, period) {
  if (period === 'diario') {
    return date1.toDateString() === date2.toDateString();
  } else if (period === 'semanal') {
    const week1 = getWeekNumber(date1);
    const week2 = getWeekNumber(date2);
    return week1.year === week2.year && week1.week === week2.week;
  } else if (period === 'mensal') {
    return date1.getFullYear() === date2.getFullYear() && 
           date1.getMonth() === date2.getMonth();
  } else {
    return date1.getFullYear() === date2.getFullYear();
  }
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return {
    year: d.getFullYear(),
    week: 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7)
  };
}

function showToast(message, type) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }, 100);
}