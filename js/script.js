const LS_USERS = "users";
const LS_TICKETS = "tickets";
const LS_SESSION = "session";
const LS_FEEDBACKS = "feedbacks";

const $ = s => document.querySelector(s);
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = k => JSON.parse(localStorage.getItem(k) || "[]");
const currentUser = () => JSON.parse(localStorage.getItem(LS_SESSION) || "null");
const logout = () => { localStorage.removeItem(LS_SESSION); renderRoleSelect(); showRodape(); }

function normalizeStatus(s) {
    return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim();
}

function showMessage(msg, type="info") {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay show";
    const modal = document.createElement("div");
    modal.className = `modal ${type}`;
    modal.innerHTML = `<p>${msg}</p><button id="closeModal">Fechar</button>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    $("#closeModal").onclick = () => { overlay.remove(); };
}

function showConfirm(msg, callback) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay show";
    const modal = document.createElement("div");
    modal.className = "modal info";
    modal.innerHTML = `<p>${msg}</p><button id="yes">Sim</button><button id="no">Não</button>`;
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    $("#yes").onclick = () => { overlay.remove(); callback(true); }
    $("#no").onclick = () => { overlay.remove(); callback(false); }
}

function ensureAdmin() {
    const users = load(LS_USERS);
    if(!users.find(u => u.email === "admin@camara.gov" && u.role === "admin")) {
        users.push({ name: "Administrador Padrão", email: "admin@camara.gov", password: "admin123", role: "admin" });
        save(LS_USERS, users);
    }
}

function showRodape() {
    const user = currentUser();
    const rodape = $("#rodapé");
    if(!rodape) return;

    let html = `© Câmara Municipal — Desenvolvido pelos Estagiários da Câmara
        <button id="btnFeedback">Deixar Feedback</button>`;
    if(user && user.role === "admin") html += ` <button id="btnViewFeedbacks">Ver Feedbacks</button>`;

    rodape.innerHTML = html;

    $("#btnFeedback")?.addEventListener("click", renderFeedback);
    $("#btnViewFeedbacks")?.addEventListener("click", renderFeedbacksAdmin);
}

function renderRoleSelect() {
    $("#top-actions").innerHTML = "";
    $("#app").innerHTML = `
        <section class="card">
            <h2>Bem-vindo ao Sistema de Chamados Internos</h2>
            <p>Selecione seu tipo de acesso:</p>
            <button id="btnAdmin">Administrador</button>
            <button id="btnReq">Requerente</button>
        </section>
    `;
    $("#btnAdmin").onclick = renderAdminLogin;
    $("#btnReq").onclick = renderReqMenu;
    showRodape();
}

function renderAdminLogin() {
    $("#app").innerHTML = `
        <section class="card">
            <h2>Login do Administrador</h2>
            <input id="admEmail" type="email" placeholder="E-mail">
            <input id="admSenha" type="password" placeholder="Senha">
            <button id="btnLoginAdm">Entrar</button>
            <button id="voltar">Voltar</button>
        </section>
    `;
    $("#voltar").onclick = renderRoleSelect;

    $("#btnLoginAdm").onclick = () => {
        const email = $("#admEmail").value.trim();
        const senha = $("#admSenha").value.trim();
        const user = load(LS_USERS).find(u => u.role === "admin" && u.email === email && u.password === senha);
        if(user) {
            localStorage.setItem(LS_SESSION, JSON.stringify(user));
            showMessage("Login realizado com sucesso!", "success");
            renderWelcome();
            showRodape();
        } else showMessage("Credenciais inválidas.", "error");
    };
}

function renderReqMenu() {
    $("#app").innerHTML = `
        <section class="card">
            <h2>Acesso do Requerente</h2>
            <button id="btnReg">Registrar-se</button>
            <button id="btnLoginReq">Fazer Login</button>
            <button id="voltar">Voltar</button>
        </section>
    `;
    $("#voltar").onclick = renderRoleSelect;
    $("#btnReg").onclick = renderReqRegister;
    $("#btnLoginReq").onclick = renderReqLogin;
}

function renderReqRegister() {
    $("#app").innerHTML = `
        <section class="card">
            <h2>Registrar-se</h2>
            <input id="regNome" placeholder="Nome completo">
            <input id="regEmail" type="email" placeholder="E-mail">
            <input id="regSenha" type="password" placeholder="Senha">
            <button id="btnRegFinal">Registrar</button>
            <button id="voltar">Voltar</button>
        </section>
    `;
    $("#voltar").onclick = renderReqMenu;
    $("#btnRegFinal").onclick = () => {
        const nome = $("#regNome").value.trim();
        const email = $("#regEmail").value.trim();
        const senha = $("#regSenha").value.trim();
        if(!nome || !email || !senha) return showMessage("Preencha todos os campos.", "error");
        const users = load(LS_USERS);
        if(users.find(u => u.email === email)) return showMessage("E-mail já cadastrado.", "error");
        users.push({ name: nome, email, password: senha, role: "req" });
        save(LS_USERS, users);
        showMessage("Registrado com sucesso! Faça login.", "success");
        renderReqLogin();
    };
}

function renderReqLogin() {
    $("#app").innerHTML = `
        <section class="card">
            <h2>Login do Requerente</h2>
            <input id="reqNome" placeholder="Nome completo">
            <input id="reqSenha" type="password" placeholder="Senha">
            <button id="btnLoginReqFinal">Entrar</button>
            <button id="voltar">Voltar</button>
        </section>
    `;
    $("#voltar").onclick = renderReqMenu;

    $("#btnLoginReqFinal").onclick = () => {
        const nome = $("#reqNome").value.trim();
        const senha = $("#reqSenha").value.trim();
        const user = load(LS_USERS).find(u => u.role === "req" && u.name === nome && u.password === senha);
        if(user) {
            localStorage.setItem(LS_SESSION, JSON.stringify(user));
            showMessage("Login realizado com sucesso!", "success");
            renderWelcome();
            showRodape();
        } else showMessage("Nome ou senha incorretos.", "error");
    };
}

function renderWelcome() {
    const user = currentUser();
    if(!user) return renderRoleSelect();
    const tickets = load(LS_TICKETS);
    const userTickets = user.role === "admin" ? tickets : tickets.filter(t => t.user === user.name);

    const abertos = userTickets.filter(t => normalizeStatus(t.status) === normalizeStatus("Aberto")).length;
    const andamento = userTickets.filter(t => normalizeStatus(t.status) === normalizeStatus("Em andamento")).length;
    const concluidos = userTickets.filter(t => normalizeStatus(t.status) === normalizeStatus("Concluído")).length;

    $("#top-actions").innerHTML = `
        <span>${user.name} (${user.role === "admin" ? "Administrador" : "Requerente"})</span>
        <button id="btnLogout" class="btn-sair">Sair</button>
    `;
    $("#btnLogout").onclick = logout;

    showRodape();

    $("#app").innerHTML = `
        <section class="card">
            <h2>Bem-vindo, ${user.name.split(" ")[0]}!</h2>
            <div style="display:flex;gap:20px;margin:20px 0;">
                <div class="status-card aberto"><h3>${abertos}</h3><p>Abertos</p></div>
                <div class="status-card andamento"><h3>${andamento}</h3><p>Em andamento</p></div>
                <div class="status-card concluido"><h3>${concluidos}</h3><p>Concluídos</p></div>
            </div>
            <button id="irChamados">Ir para Chamados</button>
        </section>
    `;

    $("#irChamados").onclick = renderApp;
}

let currentFilter = localStorage.getItem('currentFilter') || 'Todos';

function renderApp() {
    const user = currentUser();
    if(!user) return renderRoleSelect();
    const tickets = load(LS_TICKETS);
    let userTickets = user.role === "admin" ? tickets : tickets.filter(t => t.user === user.name);
    
    if (user.role === "admin" && currentFilter !== 'Todos') {
        const normalizedFilter = normalizeStatus(currentFilter);
        userTickets = userTickets.filter(t => normalizeStatus(t.status) === normalizedFilter);
    }
    
    const filterSelect = user.role === "admin" ? `
        <div style="margin-bottom: 15px;">
            <label for="statusFilter">Filtrar por Status:</label>
            <select id="statusFilter" style="width: 200px; display: inline-block; margin-left: 10px;">
                <option value="Todos">Todos</option>
                <option value="Aberto">Em Aberto</option>
                <option value="Em andamento">Em Andamento</option>
                <option value="Concluído">Concluído</option>
            </select>
        </div>
    ` : '';
    
    $("#app").innerHTML = `
        <section class="card">
            <h2>Abrir Chamado</h2>
            <select id="local"> <option value="">Local do Chamado</option>
                <option>Câmara</option>
                <option>Anexo</option>
            </select>
            <input id="setor" placeholder="Setor Específico (Ex: Adminstração)">
            <select id="tipo">
                <option value="">Tipo</option>
                <option>TI</option>
                <option>Manutenção</option>
                <option>Limpeza</option>
            </select>
            <textarea id="desc" placeholder="Descreva o problema"></textarea>
            <button id="abrir">Abrir Chamado</button>
        </section>
        <section class="card">
            <h2>Chamados</h2>
            ${filterSelect}
            <div id="listaChamados"></div> 
        </section>
    `;

    if (user.role === "admin") {
        const filterEl = $("#statusFilter");
        if (filterEl) {
            filterEl.value = currentFilter;
            filterEl.onchange = (e) => {
                currentFilter = e.target.value;
                localStorage.setItem('currentFilter', currentFilter);
                renderApp();
            };
        }
    }

    $("#abrir").onclick = () => {
        const local = $("#local").value;
        const setor = $("#setor").value.trim();
        const tipo = $("#tipo").value;
        const desc = $("#desc").value.trim();
        
        if(!local || !setor || !tipo || !desc) return showMessage("Preencha todos os campos (incluindo o Local).", "error");
        
        const novo = { id: Date.now(), local, setor, tipo, desc, status: "Aberto", user: user.name, data: new Date().toLocaleString("pt-BR") };
        const all = load(LS_TICKETS);
        all.unshift(novo);
        save(LS_TICKETS, all);
        showMessage("Chamado aberto com sucesso!", "success");
        renderApp();
    };

    const container = $("#listaChamados");
    const statusesToShow = ["Aberto","Em andamento","Concluído"];
    
    if (userTickets.length === 0) {
        container.innerHTML = "<p>Nenhum chamado encontrado.</p>";
        return;
    }

    statusesToShow.forEach(status => {
        const statusNormalizado = normalizeStatus(status);
        const list = userTickets.filter(t => normalizeStatus(t.status) === statusNormalizado);

        if (list.length > 0) {
            container.innerHTML += `<h3>${status}</h3>`;
        }

        list.forEach(t => {
            const div = document.createElement("div");
            div.className = "chamado";
            
            const statusClass = normalizeStatus(t.status).replace(/\s/g, ''); 

            div.innerHTML = `<strong>${t.tipo}</strong> - ${t.setor} (${t.local})<p>${t.desc}</p>
                             <span class="status ${statusClass}">${t.status}</span><br>
                             <small>Abertura: ${t.data}</small><br>
                             <small>Usuário: ${t.user}</small><br>`;

            if(user.role === "admin") {
                const sel = document.createElement("select");
                sel.innerHTML = `<option>Aberto</option><option>Em andamento</option><option>Concluído</option>`;
                sel.value = t.status;
                sel.onchange = () => {
                    t.status = sel.value;
                    const allTickets = load(LS_TICKETS);
                    const index = allTickets.findIndex(x => x.id === t.id);
                    if(index > -1) allTickets[index] = t;
                    save(LS_TICKETS, allTickets);
                    renderApp();
                    showMessage("Status atualizado!", "success");
                };
                div.appendChild(sel);

                const deleteBtn = document.createElement("button");
                deleteBtn.textContent = "Excluir Chamado";
                deleteBtn.style.marginLeft = "10px";
                deleteBtn.onclick = () => showConfirm("Deseja excluir este chamado?", ok => {
                    if(ok) {
                        const all = load(LS_TICKETS).filter(x => x.id !== t.id);
                        save(LS_TICKETS, all);
                        renderApp();
                        showMessage("Chamado excluído.", "success");
                    }
                });
                div.appendChild(deleteBtn);
            } else {
                const btn = document.createElement("button");
                btn.textContent = "Excluir";
                btn.onclick = () => showConfirm("Deseja excluir este chamado?", ok => {
                    if(ok) {
                        const all = load(LS_TICKETS).filter(x => x.id !== t.id);
                        save(LS_TICKETS, all);
                        renderApp();
                        showMessage("Chamado excluído.", "success");
                    }
                });
                div.appendChild(btn);
            }

            container.appendChild(div);
        });
    });
}

function renderFeedback() {
    const user = currentUser();
    if(!user) return renderRoleSelect();
    $("#app").innerHTML = `
        <section class="card feedback-card">
            <h3>Deixe seu Feedback</h3>
            <div class="stars" id="starContainer">
                <span data-value="1">&#9733;</span>
                <span data-value="2">&#9733;</span>
                <span data-value="3">&#9733;</span>
                <span data-value="4">&#9733;</span>
                <span data-value="5">&#9733;</span>
            </div>
            <textarea id="feedbackText" placeholder="Escreva seu feedback..."></textarea>
            <label><input type="checkbox" id="anonimo"> Enviar como anônimo</label>
            <button id="sendFeedback">Enviar Feedback</button>
        </section>
    `;

    let rating = 0;
    const stars = document.querySelectorAll("#starContainer span");
    stars.forEach(star => {
        star.addEventListener("mouseover", () => { stars.forEach(s=>s.classList.remove("hover")); for(let i=0;i<star.dataset.value;i++) stars[i].classList.add("hover"); });
        star.addEventListener("mouseout", () => { stars.forEach(s=>s.classList.remove("hover")); for(let i=0;i<rating;i++) stars[i].classList.add("selected"); });
        star.addEventListener("click", () => { rating = star.dataset.value; stars.forEach(s=>s.classList.remove("selected")); for(let i=0;i<rating;i++) stars[i].classList.add("selected"); });
    });

    $("#sendFeedback").onclick = () => {
        const text = $("#feedbackText").value.trim();
        const anon = $("#anonimo").checked;
        if(rating==0 && text==="") return showMessage("Escolha uma nota ou escreva algo.", "error");
        const all = load(LS_FEEDBACKS);
        all.push({ id: Date.now(), rating, text, user: anon ? "Anônimo" : user.name, date: new Date().toLocaleString("pt-BR") });
        save(LS_FEEDBACKS, all);
        showMessage("Feedback enviado!", "success");
        renderApp();
    };
}

function renderFeedbacksAdmin() {
    const user = currentUser();
    if(!user || user.role !== "admin") return renderRoleSelect();
    $("#top-actions").innerHTML = `<span>${user.name} (Administrador)</span> <button id="btnLogout" class="btn-sair">Sair</button>`;
    $("#btnLogout").onclick = logout;
    showRodape();

    const feedbacks = load(LS_FEEDBACKS);
    $("#app").innerHTML = `
        <section class="card">
            <h2>Feedbacks Recebidos</h2>
            <div id="feedbackList"></div>
            <button id="voltar">Voltar</button>
        </section>
    `;
    $("#voltar").onclick = renderWelcome;
    const list = $("#feedbackList");
    if(feedbacks.length===0) { list.innerHTML="<p>Nenhum feedback enviado ainda.</p>"; return; }

    feedbacks.forEach(f=>{
        const div = document.createElement("div");
        div.className = "feedback-item";
        div.innerHTML = `<h4>${f.user}</h4><div class="date">${f.date}</div>
                         <div class="stars">${"★".repeat(f.rating)}${"☆".repeat(5-f.rating)}</div>
                         <p>${f.text || "<i>Sem comentário</i>"}</p>`;
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Excluir Feedback";
        deleteBtn.className = "delete-feedback-btn";
        deleteBtn.onclick = () => showConfirm("Deseja excluir este feedback?", ok => {
            if(ok) {
                const all = load(LS_FEEDBACKS).filter(x => x.id !== f.id);
                save(LS_FEEDBACKS, all);
                renderFeedbacksAdmin(); 
                showMessage("Feedback excluído.", "success");
            }
        });
        div.appendChild(deleteBtn);

        list.appendChild(div);
    });
}

ensureAdmin();
currentUser() ? renderWelcome() : renderRoleSelect();
showRodape();