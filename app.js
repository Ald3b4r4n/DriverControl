// Configuração do Firebase com suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyBhqaeMZ4sCCXIF_mknXVU6cm3FgH-VNfk",
  authDomain: "drivercontrol-f9af8.firebaseapp.com",
  projectId: "drivercontrol-f9af8",
  storageBucket: "drivercontrol-f9af8.appspot.com",
  messagingSenderId: "923692979527",
  appId: "1:923692979527:web:2c2e376e20b3f4805da862",
  measurementId: "G-3HVHX30V2H",
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Variáveis globais
let pieChart = null;
let lineChart = null;
let consumptionChart = null;
let currentEditId = null;
let currentCollection = null;

// Elementos do DOM
const navBtns = document.querySelectorAll(".nav-btn");
const tabContents = document.querySelectorAll(".tab-content");
const saveEarningsBtn = document.getElementById("save-earnings");
const saveFuelBtn = document.getElementById("save-fuel");
const saveKmBtn = document.getElementById("save-km");
const updateChartsBtn = document.getElementById("update-charts");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const editModal = document.getElementById("edit-modal");
const modalForm = document.getElementById("modal-form");
const saveEditBtn = document.getElementById("save-edit");
const closeModal = document.querySelector(".close-modal");

// Inicialização do app
document.addEventListener("DOMContentLoaded", () => {
  // Event listeners
  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.getAttribute("data-tab");
      switchTab(tabId);
    });
  });

  // Definir datas padrão para gráficos (últimos 7 dias)
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 7);

  startDateInput.value = formatDateForInput(oneWeekAgo);
  endDateInput.value = formatDateForInput(today);

  // Configurar máscara de dinheiro
  document.querySelectorAll(".money-input").forEach((input) => {
    input.addEventListener("input", formatCurrency);
  });

  // Definir data padrão para os inputs de data
  document.querySelectorAll('input[type="date"]').forEach((input) => {
    input.value = formatDateForInput(new Date());
  });

  saveEarningsBtn.addEventListener("click", saveEarning);
  saveFuelBtn.addEventListener("click", saveFuel);
  saveKmBtn.addEventListener("click", saveKm);
  updateChartsBtn.addEventListener("click", loadChartsData);
  closeModal.addEventListener(
    "click",
    () => (editModal.style.display = "none")
  );
  saveEditBtn.addEventListener("click", saveEdit);

  // Fechar modal ao clicar fora
  window.addEventListener("click", (event) => {
    if (event.target === editModal) {
      editModal.style.display = "none";
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
  navBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-tab") === tabId);
  });

  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === tabId);
  });

  if (tabId === "graficos") {
    loadChartsData();
  }
}

// Formatação de moeda
function formatCurrency(e) {
  let value = e.target.value.replace(/\D/g, "");
  value = (value / 100).toFixed(2) + "";
  value = value.replace(".", ",");
  value = value.replace(/(\d)(\d{3})(\d{3}),/g, "$1.$2.$3,");
  value = value.replace(/(\d)(\d{3}),/g, "$1.$2,");
  e.target.value = value;
}

function parseCurrency(value) {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}

// Funções de dados - Ganhos
function loadEarningsData() {
  const earningsTable = document.querySelector("#earnings-table tbody");
  earningsTable.innerHTML =
    '<tr><td colspan="4" style="text-align: center;">Carregando...</td></tr>';

  db.collection("earnings")
    .orderBy("date", "desc")
    .limit(10)
    .get()
    .then((snapshot) => {
      earningsTable.innerHTML = "";

      if (snapshot.empty) {
        earningsTable.innerHTML =
          '<tr><td colspan="4" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(data.date.toDate());

        const appCell = document.createElement("td");
        appCell.textContent = getAppName(data.app);

        const amountCell = document.createElement("td");
        const amountSpan = document.createElement("span");
        amountSpan.className = "editable-value";
        amountSpan.textContent = `R$ ${data.amount
          .toFixed(2)
          .replace(".", ",")}`;
        amountSpan.addEventListener("click", () =>
          openEditModal(doc.id, "earnings", {
            amount: data.amount,
            app: data.app,
            date: data.date.toDate(),
          })
        );
        amountCell.appendChild(amountSpan);

        const actionsCell = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = "btn-action btn-delete";
        deleteBtn.addEventListener("click", () => deleteEarning(doc.id));
        actionsCell.appendChild(deleteBtn);

        row.appendChild(dateCell);
        row.appendChild(appCell);
        row.appendChild(amountCell);
        row.appendChild(actionsCell);

        earningsTable.appendChild(row);
      });
    })
    .catch((error) => {
      earningsTable.innerHTML =
        '<tr><td colspan="4" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error("Erro ao carregar ganhos:", error);
    });
}

function saveEarning() {
  const app = document.getElementById("app-select").value;
  const amount = parseCurrency(
    document.getElementById("earnings-amount").value
  );
  const dateInput = document.getElementById("earnings-date").value;
  const date = dateInput ? buildLocalDate(dateInput) : new Date();

  if (!amount || amount <= 0) {
    showToast("Informe um valor válido", "error");
    return;
  }

  saveEarningsBtn.disabled = true;
  saveEarningsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  // Ajustar data para evitar problemas de fuso horário
  const adjustedDate = adjustDateForTimezone(date);

  db.collection("earnings")
    .add({
      app: app,
      amount: amount,
      date: adjustedDate,
    })
    .then(() => {
      document.getElementById("earnings-amount").value = "";
      loadEarningsData();
      loadChartsData();
      showToast("Ganho registrado com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao salvar: " + error.message, "error");
    })
    .finally(() => {
      saveEarningsBtn.disabled = false;
      saveEarningsBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Ganho';
    });
}

function deleteEarning(id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  db.collection("earnings")
    .doc(id)
    .delete()
    .then(() => {
      loadEarningsData();
      loadChartsData();
      showToast("Registro excluído com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao excluir: " + error.message, "error");
    });
}

// Funções de dados - Combustível
function loadFuelData() {
  const fuelTable = document.querySelector("#fuel-table tbody");
  fuelTable.innerHTML =
    '<tr><td colspan="5" style="text-align: center;">Carregando...</td></tr>';

  db.collection("fuel")
    .orderBy("date", "desc")
    .limit(10)
    .get()
    .then((snapshot) => {
      fuelTable.innerHTML = "";

      if (snapshot.empty) {
        fuelTable.innerHTML =
          '<tr><td colspan="5" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(data.date.toDate());

        const amountCell = document.createElement("td");
        const amountSpan = document.createElement("span");
        amountSpan.className = "editable-value";
        amountSpan.textContent = `R$ ${data.amount
          .toFixed(2)
          .replace(".", ",")}`;
        amountSpan.addEventListener("click", () =>
          openEditModal(doc.id, "fuel", {
            amount: data.amount,
            liters: data.liters || "",
            date: data.date.toDate(),
          })
        );
        amountCell.appendChild(amountSpan);

        const litersCell = document.createElement("td");
        litersCell.textContent = data.liters
          ? data.liters.toFixed(1).replace(".", ",") + " L"
          : "N/A";

        const priceCell = document.createElement("td");
        priceCell.textContent = data.liters
          ? `R$ ${(data.amount / data.liters).toFixed(3).replace(".", ",")}/L`
          : "N/A";

        const actionsCell = document.createElement("td");
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = "btn-action btn-delete";
        deleteBtn.addEventListener("click", () => deleteFuel(doc.id));
        actionsCell.appendChild(deleteBtn);

        row.appendChild(dateCell);
        row.appendChild(amountCell);
        row.appendChild(litersCell);
        row.appendChild(priceCell);
        row.appendChild(actionsCell);

        fuelTable.appendChild(row);
      });
    })
    .catch((error) => {
      fuelTable.innerHTML =
        '<tr><td colspan="5" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error("Erro ao carregar combustível:", error);
    });
}

function saveFuel() {
  const amount = parseCurrency(document.getElementById("fuel-amount").value);
  const liters = parseFloat(
    document.getElementById("fuel-liters").value.replace(",", ".")
  );
  const dateInput = document.getElementById("fuel-date").value;
  const date = dateInput ? buildLocalDate(dateInput) : new Date();

  if (!amount || amount <= 0) {
    showToast("Informe um valor válido", "error");
    return;
  }

  saveFuelBtn.disabled = true;
  saveFuelBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  // Ajustar data para evitar problemas de fuso horário
  const adjustedDate = adjustDateForTimezone(date);

  const fuelData = {
    amount: amount,
    date: adjustedDate,
  };

  if (liters && liters > 0) {
    fuelData.liters = liters;
  }

  db.collection("fuel")
    .add(fuelData)
    .then(() => {
      document.getElementById("fuel-amount").value = "";
      document.getElementById("fuel-liters").value = "";
      loadFuelData();
      loadChartsData();
      showToast("Abastecimento registrado com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao salvar: " + error.message, "error");
    })
    .finally(() => {
      saveFuelBtn.disabled = false;
      saveFuelBtn.innerHTML =
        '<i class="fas fa-save"></i> Salvar Abastecimento';
    });
}

function deleteFuel(id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  db.collection("fuel")
    .doc(id)
    .delete()
    .then(() => {
      loadFuelData();
      loadChartsData();
      showToast("Registro excluído com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao excluir: " + error.message, "error");
    });
}

// Funções de dados - Quilometragem
function loadKmData() {
  const kmTable = document.querySelector("#km-table tbody");
  kmTable.innerHTML =
    '<tr><td colspan="6" style="text-align: center;">Carregando...</td></tr>';

  db.collection("kilometers")
    .orderBy("date", "desc")
    .limit(10)
    .get()
    .then((snapshot) => {
      kmTable.innerHTML = "";

      if (snapshot.empty) {
        kmTable.innerHTML =
          '<tr><td colspan="6" style="text-align: center;">Nenhum registro encontrado</td></tr>';
        return;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const row = document.createElement("tr");

        const dateCell = document.createElement("td");
        dateCell.textContent = formatDate(data.date.toDate());

        const kmInicialCell = document.createElement("td");
        kmInicialCell.textContent = data.kmInitial;

        const kmFinalCell = document.createElement("td");
        kmFinalCell.textContent = data.kmFinal;

        const totalKmCell = document.createElement("td");
        const totalKm = data.kmFinal - data.kmInitial;
        totalKmCell.textContent = `${totalKm} km`;

        const kmProfitCell = document.createElement("td");
        kmProfitCell.textContent = "Calculando...";

        // Busca os ganhos e combustível do mesmo dia para calcular R$/km
        const sameDay = new Date(data.date.toDate());
        sameDay.setHours(0, 0, 0, 0);
        const nextDay = new Date(sameDay);
        nextDay.setDate(nextDay.getDate() + 1);

        Promise.all([
          db
            .collection("earnings")
            .where("date", ">=", sameDay)
            .where("date", "<", nextDay)
            .get(),
          db
            .collection("fuel")
            .where("date", ">=", sameDay)
            .where("date", "<", nextDay)
            .get(),
        ])
          .then(([earningsSnapshot, fuelSnapshot]) => {
            let totalEarnings = 0;
            earningsSnapshot.forEach((earningDoc) => {
              totalEarnings += earningDoc.data().amount;
            });

            let totalFuel = 0;
            fuelSnapshot.forEach((fuelDoc) => {
              totalFuel += fuelDoc.data().amount;
            });

            const kmProfit = (totalEarnings - totalFuel) / totalKm;
            kmProfitCell.textContent = `R$ ${kmProfit
              .toFixed(2)
              .replace(".", ",")}/km`;
          })
          .catch(() => {
            kmProfitCell.textContent = "N/A";
          });

        const actionsCell = document.createElement("td");
        const editBtn = document.createElement("button");
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.className = "btn-action btn-edit";
        editBtn.addEventListener("click", () =>
          openEditModal(doc.id, "kilometers", {
            kmInitial: data.kmInitial,
            kmFinal: data.kmFinal,
            date: data.date.toDate(),
          })
        );

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.className = "btn-action btn-delete";
        deleteBtn.addEventListener("click", () => deleteKm(doc.id));

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
    .catch((error) => {
      kmTable.innerHTML =
        '<tr><td colspan="6" style="text-align: center; color: var(--danger);">Erro ao carregar dados</td></tr>';
      console.error("Erro ao carregar quilometragem:", error);
    });
}

function saveKm() {
  const kmInitial = parseInt(document.getElementById("km-inicial").value);
  const kmFinal = parseInt(document.getElementById("km-final").value);
  const dateInput = document.getElementById("km-date").value;
  const date = dateInput ? buildLocalDate(dateInput) : new Date();

  if (!kmInitial || kmInitial < 0 || !kmFinal || kmFinal <= kmInitial) {
    showToast(
      "Informe valores válidos (Km Final deve ser maior que Km Inicial)",
      "error"
    );
    return;
  }

  saveKmBtn.disabled = true;
  saveKmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  // Ajustar data para evitar problemas de fuso horário
  const adjustedDate = adjustDateForTimezone(date);

  db.collection("kilometers")
    .add({
      kmInitial: kmInitial,
      kmFinal: kmFinal,
      date: adjustedDate,
    })
    .then(() => {
      document.getElementById("km-inicial").value = "";
      document.getElementById("km-final").value = "";
      loadKmData();
      loadChartsData();
      showToast("Quilometragem registrada com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao salvar: " + error.message, "error");
    })
    .finally(() => {
      saveKmBtn.disabled = false;
      saveKmBtn.innerHTML = '<i class="fas fa-save"></i> Salvar Quilometragem';
    });
}

function deleteKm(id) {
  if (!confirm("Tem certeza que deseja excluir este registro?")) return;

  db.collection("kilometers")
    .doc(id)
    .delete()
    .then(() => {
      loadKmData();
      loadChartsData();
      showToast("Registro excluído com sucesso!", "success");
    })
    .catch((error) => {
      showToast("Erro ao excluir: " + error.message, "error");
    });
}

// Funções de edição
function openEditModal(id, collection, data) {
  currentEditId = id;
  currentCollection = collection;
  modalForm.innerHTML = "";

  if (collection === "earnings") {
    modalForm.innerHTML = `
      <div class="form-group">
        <select id="edit-app" class="full-width">
          <option value="99" ${data.app === "99" ? "selected" : ""}>99</option>
          <option value="indrive" ${
            data.app === "indrive" ? "selected" : ""
          }>Indrive</option>
          <option value="iupe" ${
            data.app === "iupe" ? "selected" : ""
          }>IUPE</option>
          <option value="uber" ${
            data.app === "uber" ? "selected" : ""
          }>Uber</option>
          <option value="outros" ${
            data.app === "outros" ? "selected" : ""
          }>Outros</option>
        </select>
      </div>
      <div class="form-group">
        <input type="text" id="edit-amount" value="${data.amount
          .toFixed(2)
          .replace(
            ".",
            ","
          )}" class="full-width money-input" placeholder="Valor (R$)">
      </div>
      <div class="form-group">
        <label>Data:</label>
        <input type="date" id="edit-date" value="${formatDateForInput(
          data.date
        )}" class="full-width">
      </div>
    `;
  } else if (collection === "fuel") {
    modalForm.innerHTML = `
      <div class="form-group">
        <input type="text" id="edit-amount" value="${data.amount
          .toFixed(2)
          .replace(
            ".",
            ","
          )}" class="full-width money-input" placeholder="Valor (R$)">
      </div>
      <div class="form-group">
        <input type="number" id="edit-liters" value="${
          data.liters || ""
        }" step="0.1" class="full-width" placeholder="Litros">
      </div>
      <div class="form-group">
        <label>Data:</label>
        <input type="date" id="edit-date" value="${formatDateForInput(
          data.date
        )}" class="full-width">
      </div>
    `;
  } else if (collection === "kilometers") {
    modalForm.innerHTML = `
      <div class="form-group">
        <input type="number" id="edit-km-initial" value="${
          data.kmInitial
        }" class="full-width" placeholder="Km Inicial">
      </div>
      <div class="form-group">
        <input type="number" id="edit-km-final" value="${
          data.kmFinal
        }" class="full-width" placeholder="Km Final">
      </div>
      <div class="form-group">
        <label>Data:</label>
        <input type="date" id="edit-date" value="${formatDateForInput(
          data.date
        )}" class="full-width">
      </div>
    `;
  }

  // Reaplicar máscara monetária
  document.querySelectorAll(".money-input").forEach((input) => {
    input.addEventListener("input", formatCurrency);
  });

  editModal.style.display = "block";
}

function saveEdit() {
  if (!currentEditId || !currentCollection) return;

  const updateData = {};
  const dateInput = document.getElementById("edit-date").value;
  if (dateInput) {
    const date = buildLocalDate(dateInput);
    updateData.date = adjustDateForTimezone(date);
  }

  if (currentCollection === "earnings") {
    const amount = parseCurrency(document.getElementById("edit-amount").value);
    const app = document.getElementById("edit-app").value;

    if (!amount || amount <= 0) {
      showToast("Informe um valor válido", "error");
      return;
    }

    updateData.amount = amount;
    updateData.app = app;
  } else if (currentCollection === "fuel") {
    const amount = parseCurrency(document.getElementById("edit-amount").value);
    const liters = parseFloat(
      document.getElementById("edit-liters").value.replace(",", ".")
    );

    if (!amount || amount <= 0) {
      showToast("Informe um valor válido", "error");
      return;
    }

    updateData.amount = amount;
    if (liters && liters > 0) {
      updateData.liters = liters;
    }
  } else if (currentCollection === "kilometers") {
    const kmInitial = parseInt(
      document.getElementById("edit-km-initial").value
    );
    const kmFinal = parseInt(document.getElementById("edit-km-final").value);

    if (!kmInitial || kmInitial < 0 || !kmFinal || kmFinal <= kmInitial) {
      showToast(
        "Informe valores válidos (Km Final deve ser maior que Km Inicial)",
        "error"
      );
      return;
    }

    updateData.kmInitial = kmInitial;
    updateData.kmFinal = kmFinal;
  }

  saveEditBtn.disabled = true;
  saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

  db.collection(currentCollection)
    .doc(currentEditId)
    .update(updateData)
    .then(() => {
      showToast("Registro atualizado com sucesso!", "success");
      editModal.style.display = "none";

      // Atualiza a tabela correspondente
      if (currentCollection === "earnings") {
        loadEarningsData();
      } else if (currentCollection === "fuel") {
        loadFuelData();
      } else if (currentCollection === "kilometers") {
        loadKmData();
      }

      // Atualiza gráficos
      loadChartsData();
    })
    .catch((error) => {
      showToast("Erro ao atualizar: " + error.message, "error");
    })
    .finally(() => {
      saveEditBtn.disabled = false;
      saveEditBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    });
}

// Funções de gráficos
function loadChartsData() {
  let startDate = buildLocalDate(startDateInput.value);
  let endDate = buildLocalDate(endDateInput.value);

  // Ajustar datas para cobrir todo o dia
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  updateChartsBtn.disabled = true;
  updateChartsBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin"></i> Carregando...';

  // Busca dados
  Promise.all([
    db
      .collection("earnings")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get(),
    db
      .collection("fuel")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get(),
    db
      .collection("kilometers")
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .get(),
  ])
    .then(([earningsSnapshot, fuelSnapshot, kmSnapshot]) => {
      // Processar dados para gráficos
      const earningsData = [];
      earningsSnapshot.forEach((doc) => {
        const data = doc.data();
        earningsData.push({
          ...data,
          date: data.date.toDate(),
        });
      });

      const fuelData = [];
      fuelSnapshot.forEach((doc) => {
        const data = doc.data();
        fuelData.push({
          ...data,
          date: data.date.toDate(),
        });
      });

      const kmData = [];
      kmSnapshot.forEach((doc) => {
        const data = doc.data();
        kmData.push({
          ...data,
          date: data.date.toDate(),
        });
      });

      // Processa ganhos por aplicativo
      const earningsByApp = {
        uber: 0,
        99: 0,
        indrive: 0,
        iupe: 0,
        outros: 0,
      };

      let totalEarnings = 0;
      earningsData.forEach((data) => {
        earningsByApp[data.app] += data.amount;
        totalEarnings += data.amount;
      });

      // Processa gastos com combustível
      let totalFuel = 0;
      fuelData.forEach((data) => {
        totalFuel += data.amount;
      });

      // Processa quilometragem
      let totalKm = 0;
      kmData.forEach((data) => {
        totalKm += data.kmFinal - data.kmInitial;
      });

      // Calcula R$/km
      const kmProfit = totalKm > 0 ? totalEarnings / totalKm : 0;

      // Atualiza cards de resumo
      document.getElementById(
        "total-earnings"
      ).textContent = `R$ ${totalEarnings.toFixed(2).replace(".", ",")}`;
      document.getElementById("total-fuel").textContent = `R$ ${totalFuel
        .toFixed(2)
        .replace(".", ",")}`;
      document.getElementById("total-km").textContent = `${totalKm} km`;
      document.getElementById("total-profit").textContent = `R$ ${(
        totalEarnings - totalFuel
      )
        .toFixed(2)
        .replace(".", ",")}`;
      document.getElementById("km-profit").textContent = `R$ ${kmProfit
        .toFixed(2)
        .replace(".", ",")}/km`;

      // Prepara dados para gráfico de pizza
      const pieLabels = [];
      const pieData = [];
      const pieColors = ["#4a6cf7", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

      for (const [app, amount] of Object.entries(earningsByApp)) {
        if (amount > 0) {
          pieLabels.push(getAppName(app));
          pieData.push(amount);
        }
      }

      // Atualiza/Cria gráfico de pizza
      const pieCtx = document.getElementById("pie-chart").getContext("2d");
      if (pieChart) {
        pieChart.data.labels = pieLabels;
        pieChart.data.datasets[0].data = pieData;
        pieChart.update();
      } else {
        pieChart = new Chart(pieCtx, {
          type: "pie",
          data: {
            labels: pieLabels,
            datasets: [
              {
                data: pieData,
                backgroundColor: pieColors,
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: {
                position: "bottom",
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    const label = context.label || "";
                    const value = context.raw || 0;
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = Math.round((value / total) * 100);
                    return `${label}: R$ ${value
                      .toFixed(2)
                      .replace(".", ",")} (${percentage}%)`;
                  },
                },
              },
            },
          },
        });
      }

      // Prepara dados para gráfico de linhas
      const lineLabels = [];
      const lineEarnings = [];
      const lineFuel = [];
      const lineProfit = [];

      // Agrupar por dia
      const dates = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        dates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      dates.forEach((date) => {
        const dateStr = formatDate(date);
        lineLabels.push(dateStr);

        // Ganhos do dia
        let dayEarnings = 0;
        earningsData.forEach((data) => {
          if (isSameDay(data.date, date)) {
            dayEarnings += data.amount;
          }
        });
        lineEarnings.push(dayEarnings);

        // Combustível do dia
        let dayFuel = 0;
        fuelData.forEach((data) => {
          if (isSameDay(data.date, date)) {
            dayFuel += data.amount;
          }
        });
        lineFuel.push(dayFuel);

        // Lucro do dia
        lineProfit.push(dayEarnings - dayFuel);
      });

      // Atualiza/Cria gráfico de linhas
      const lineCtx = document.getElementById("line-chart").getContext("2d");
      if (lineChart) {
        lineChart.data.labels = lineLabels;
        lineChart.data.datasets[0].data = lineEarnings;
        lineChart.data.datasets[1].data = lineFuel;
        lineChart.data.datasets[2].data = lineProfit;
        lineChart.update();
      } else {
        lineChart = new Chart(lineCtx, {
          type: "line",
          data: {
            labels: lineLabels,
            datasets: [
              {
                label: "Ganhos",
                data: lineEarnings,
                borderColor: "#4361ee",
                backgroundColor: "rgba(67, 97, 238, 0.1)",
                tension: 0.4,
                fill: true,
              },
              {
                label: "Combustível",
                data: lineFuel,
                borderColor: "#f72585",
                backgroundColor: "rgba(247, 37, 133, 0.1)",
                tension: 0.4,
                fill: true,
              },
              {
                label: "Lucro",
                data: lineProfit,
                borderColor: "#4cc9f0",
                backgroundColor: "rgba(76, 201, 240, 0.1)",
                tension: 0.4,
                fill: true,
                borderDash: [5, 5],
              },
            ],
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (value) {
                    return "R$ " + value;
                  },
                },
              },
            },
            plugins: {
              tooltip: {
                callbacks: {
                  label: function (context) {
                    let label = context.dataset.label || "";
                    if (label) {
                      label += ": ";
                    }
                    label += "R$ " + context.raw.toFixed(2).replace(".", ",");
                    return label;
                  },
                },
              },
            },
          },
        });
      }

      // Gráfico de consumo (apenas para aba de gráficos)
      const consumptionData = calculateConsumptionData(fuelData, kmData);
      renderConsumptionChart(consumptionData);
    })
    .catch((error) => {
      console.error("Erro ao carregar dados para gráficos:", error);
      showToast("Erro ao carregar dados para gráficos", "error");
    })
    .finally(() => {
      updateChartsBtn.disabled = false;
      updateChartsBtn.innerHTML =
        '<i class="fas fa-sync-alt"></i> Atualizar Gráficos';
    });
}

// Renderizar gráfico de consumo
function renderConsumptionChart(consumptionData) {
  const ctx = document.getElementById("consumption-chart").getContext("2d");

  if (consumptionChart) {
    consumptionChart.data.labels = consumptionData.map((d) => d.date);
    consumptionChart.data.datasets[0].data = consumptionData.map(
      (d) => d.value
    );
    consumptionChart.update();
  } else {
    consumptionChart = new Chart(ctx, {
      type: "bar",
      data: {
        labels: consumptionData.map((d) => d.date),
        datasets: [
          {
            label: "Consumo (km/L)",
            data: consumptionData.map((d) => d.value),
            backgroundColor: "#10b981",
            borderColor: "#047857",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "km/L",
            },
          },
        },
      },
    });
  }
}

// Funções auxiliares
function getAppName(appCode) {
  const apps = {
    uber: "Uber",
    99: "99",
    indrive: "Indrive",
    iupe: "IUPE",
    outros: "Outros",
  };
  return apps[appCode] || appCode;
}

function formatDate(date) {
  return date.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function formatDateForInput(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function adjustDateForTimezone(date) {
  const localDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0
  );
  return localDate;
}

function calculateConsumptionData(fuelData, kmData) {
  const consumptionData = [];

  // Ordenar abastecimentos por data
  fuelData.sort((a, b) => a.date - b.date);

  for (let i = 1; i < fuelData.length; i++) {
    const current = fuelData[i];
    const previous = fuelData[i - 1];

    if (current.liters) {
      // Calcular km rodados entre abastecimentos
      let kmBetween = 0;
      kmData.forEach((km) => {
        if (km.date > previous.date && km.date <= current.date) {
          kmBetween += km.kmFinal - km.kmInitial;
        }
      });

      if (kmBetween > 0) {
        const consumption = kmBetween / current.liters;
        consumptionData.push({
          date: formatDate(current.date),
          value: parseFloat(consumption.toFixed(1)),
        });
      }
    }
  }

  return consumptionData;
}

function showToast(message, type) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
  }, 100);
}
function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function buildLocalDate(inputValue) {
  const parts = inputValue.split("-");
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  return new Date(year, month, day, 12, 0, 0); // meio-dia
}
// No console
firebase
  .firestore()
  .collection("earnings")
  .get()
  .then((snapshot) => {
    snapshot.forEach((doc) => {
      if (!doc.data().date) console.log("Registro com date nulo:", doc.id);
    });
  });
