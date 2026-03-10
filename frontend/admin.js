const API_BASE = "/api";

const $ = (id) => document.getElementById(id);

function setMsg(text, type = "ok") {
  const msg = $("msg");
  msg.textContent = text;
  msg.className = `msg ${type}`;
}

function showUploadArea() {
  $("loginBox").classList.add("hidden");
  $("uploadBox").classList.remove("hidden");
}

function showLoginArea() {
  $("loginBox").classList.remove("hidden");
  $("uploadBox").classList.add("hidden");
}

function getToken() {
  return localStorage.getItem("ppa_admin_token");
}

function saveToken(token) {
  localStorage.setItem("ppa_admin_token", token);
}

function removeToken() {
  localStorage.removeItem("ppa_admin_token");
}

async function validateSession() {
  const token = getToken();

  if (!token) {
    showLoginArea();
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Sessão inválida.");
    }

    showUploadArea();
    setMsg("Sessão administrativa ativa.", "ok");
  } catch (error) {
    removeToken();
    showLoginArea();
    setMsg("Faça login para acessar a área administrativa.", "error");
  }
}

$("loginBtn").addEventListener("click", async () => {
  try {
    const username = $("username").value.trim();
    const password = $("password").value;

    if (!username || !password) {
      throw new Error("Preencha usuário e senha.");
    }

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro no login.");
    }

    saveToken(data.token);
    showUploadArea();
    setMsg("Login realizado com sucesso.", "ok");
    $("password").value = "";
  } catch (error) {
    setMsg(error.message, "error");
  }
});

$("uploadBtn").addEventListener("click", async () => {
  try {
    const token = getToken();
    if (!token) throw new Error("Você precisa estar logado.");

    const date = $("dateInput").value;
    const mode = $("modeSelect").value;
    const file = $("fileInput").files[0];

    if (!date) throw new Error("Selecione a data da aderência.");
    if (!file) throw new Error("Selecione um arquivo CSV ou XLSX.");

    const formData = new FormData();
    formData.append("date", date);
    formData.append("mode", mode);
    formData.append("file", file);

    const response = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Erro ao enviar arquivo.");
    }

    setMsg(data.message || "Upload concluído com sucesso.", "ok");
    $("fileInput").value = "";
  } catch (error) {
    setMsg(error.message, "error");
  }
});

$("logoutBtn").addEventListener("click", () => {
  removeToken();
  showLoginArea();
  setMsg("Sessão encerrada.", "ok");
});

validateSession();