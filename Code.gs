// Biblioteca Escolar - versão atualizada (final)
const ABA_ALUNOS = "Alunos";
const ABA_LIVROS = "Livros";
const ABA_EMPRESTIMOS = "Emprestimos";
const ABA_USUARIOS = "Usuarios";
const ABA_LOGS = "Logs";
const CABECALHO_LOGS = ["DataHora", "Usuario", "Acao", "Detalhes"];

function doGet() {
  return HtmlService.createHtmlOutputFromFile("Index")
    .setTitle("Biblioteca Escolar")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(nomeAba) {
  const sheet = getSpreadsheet().getSheetByName(nomeAba);
  if (!sheet) {
    throw new Error("A aba '" + nomeAba + "' não foi encontrada.");
  }
  return sheet;
}

function normalizarTexto(valor) {
  return String(valor || "").trim();
}

function gerarId(prefixo) {
  return prefixo + "_" + new Date().getTime() + "_" + Math.floor(Math.random() * 1000);
}

function formatarData(data) {
  if (!data) return "";
  return Utilities.formatDate(new Date(data), Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function hojeZerado() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return hoje;
}

function parseNumero(valor) {
  const n = Number(valor);
  return isNaN(n) ? 0 : n;
}

function converterDataISOParaDate(dataStr) {
  if (!dataStr) return null;
  const partes = String(dataStr).split("-");
  if (partes.length !== 3) return null;
  return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]), 0, 0, 0, 0);
}


function garantirAbaLogs() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(ABA_LOGS);
  if (!sheet) {
    sheet = ss.insertSheet(ABA_LOGS);
    sheet.appendRow(CABECALHO_LOGS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHO_LOGS);
  }
  return sheet;
}

function registrarLog(acao, detalhes, usuario) {
  try {
    const sheet = garantirAbaLogs();
    sheet.appendRow([new Date(), normalizarTexto(usuario || "Sistema"), normalizarTexto(acao), normalizarTexto(detalhes)]);
  } catch (e) {
    // Não interrompe fluxo principal por falha de log
  }
}

function listarLogs(limite) {
  const sheet = garantirAbaLogs();
  const valores = sheet.getDataRange().getValues();
  const dados = [];
  const max = parseNumero(limite || 100);

  for (let i = 1; i < valores.length; i++) {
    dados.push({
      data_hora: valores[i][0] ? formatarData(valores[i][0]) + " " + Utilities.formatDate(new Date(valores[i][0]), Session.getScriptTimeZone(), "HH:mm:ss") : "",
      usuario: valores[i][1] || "",
      acao: valores[i][2] || "",
      detalhes: valores[i][3] || ""
    });
  }

  return dados.reverse().slice(0, max > 0 ? max : 100);
}

function login(usuario, senha) {
  const sheet = getSheet(ABA_USUARIOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    if (
      normalizarTexto(row[0]) === normalizarTexto(usuario) &&
      normalizarTexto(row[1]) === normalizarTexto(senha)
    ) {
      registrarLog("LOGIN_SUCESSO", "Login realizado", row[0]);
      return {
        sucesso: true,
        usuario: {
          usuario: row[0],
          nome: row[2],
          perfil: row[3]
        }
      };
    }
  }

  registrarLog("LOGIN_FALHA", "Usuário ou senha inválidos", usuario);
  return { sucesso: false, mensagem: "Usuário ou senha inválidos." };
}


function recuperarSenha(dados) {
  const usuario = normalizarTexto(dados && dados.usuario);
  const nome = normalizarTexto(dados && dados.nome);
  const novaSenha = normalizarTexto(dados && dados.nova_senha);

  if (!usuario || !nome || !novaSenha) {
    return { sucesso: false, mensagem: "Informe usuário, nome e nova senha." };
  }
  if (novaSenha.length < 4) {
    return { sucesso: false, mensagem: "A nova senha deve ter pelo menos 4 caracteres." };
  }

  const sheet = getSheet(ABA_USUARIOS);
  const valores = sheet.getDataRange().getValues();

  for (let i = 1; i < valores.length; i++) {
    const rowUsuario = normalizarTexto(valores[i][0]);
    const rowNome = normalizarTexto(valores[i][2]);
    if (rowUsuario === usuario && rowNome.toLowerCase() === nome.toLowerCase()) {
      sheet.getRange(i + 1, 2).setValue(novaSenha);
      registrarLog("RECUPERAR_SENHA", "Usuário: " + usuario, usuario);
      return { sucesso: true, mensagem: "Senha atualizada com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Usuário e nome não conferem." };
}

function listarAlunos() {
  const sheet = getSheet(ABA_ALUNOS);
  const dados = sheet.getDataRange().getValues();
  const alunos = [];

  for (let i = 1; i < dados.length; i++) {
    if (!dados[i][0] && !dados[i][1]) continue;
    alunos.push({ matricula: dados[i][0], nome: dados[i][1] });
  }

  return alunos;
}

function buscarAlunoPorMatricula(matricula) {
  const sheet = getSheet(ABA_ALUNOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const row = dados[i];
    if (normalizarTexto(row[0]) === normalizarTexto(matricula)) {
      return { encontrado: true, matricula: row[0], nome: row[1] };
    }
  }

  return { encontrado: false, mensagem: "Aluno não encontrado." };
}

function cadastrarAluno(aluno) {
  const matricula = normalizarTexto(aluno.matricula);
  const nome = normalizarTexto(aluno.nome);

  if (!matricula || !nome) {
    return { sucesso: false, mensagem: "Preencha matrícula e nome do aluno." };
  }

  const sheet = getSheet(ABA_ALUNOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === matricula) {
      return { sucesso: false, mensagem: "Já existe aluno com essa matrícula." };
    }
  }

  sheet.appendRow([matricula, nome]);
  registrarLog("ALUNO_CADASTRAR", "Matrícula: " + matricula, "Sistema");
  return { sucesso: true, mensagem: "Aluno cadastrado com sucesso." };
}

function editarAluno(aluno) {
  const matriculaOriginal = normalizarTexto(aluno.matricula_original);
  const novaMatricula = normalizarTexto(aluno.matricula);
  const novoNome = normalizarTexto(aluno.nome);

  if (!matriculaOriginal || !novaMatricula || !novoNome) {
    return { sucesso: false, mensagem: "Dados do aluno incompletos para edição." };
  }

  const sheet = getSheet(ABA_ALUNOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    const matriculaLinha = normalizarTexto(dados[i][0]);
    if (matriculaLinha === novaMatricula && matriculaLinha !== matriculaOriginal) {
      return { sucesso: false, mensagem: "Já existe outro aluno com essa matrícula." };
    }
  }

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === matriculaOriginal) {
      sheet.getRange(i + 1, 1).setValue(novaMatricula);
      sheet.getRange(i + 1, 2).setValue(novoNome);
      atualizarAlunoNosEmprestimos(matriculaOriginal, novaMatricula, novoNome);
      registrarLog("ALUNO_EDITAR", "Matrícula: " + novaMatricula, "Sistema");
      return { sucesso: true, mensagem: "Aluno atualizado com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Aluno não encontrado para edição." };
}

function excluirAluno(matricula) {
  matricula = normalizarTexto(matricula);
  if (!matricula) return { sucesso: false, mensagem: "Matrícula não informada." };
  if (alunoTemEmprestimoAtivo(matricula)) {
    return { sucesso: false, mensagem: "Não é possível excluir aluno com empréstimo ativo." };
  }

  const sheet = getSheet(ABA_ALUNOS);
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === matricula) {
      sheet.deleteRow(i + 1);
      registrarLog("ALUNO_EXCLUIR", "Matrícula: " + matricula, "Sistema");
      return { sucesso: true, mensagem: "Aluno excluído com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Aluno não encontrado para exclusão." };
}

function alunoTemEmprestimoAtivo(matricula) {
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    const statusReal = normalizarTexto(dados[i][8]);
    if (normalizarTexto(dados[i][1]) === normalizarTexto(matricula) && statusReal !== "Devolvido") return true;
  }
  return false;
}

function atualizarAlunoNosEmprestimos(matriculaOriginal, novaMatricula, novoNome) {
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][1]) === normalizarTexto(matriculaOriginal)) {
      sheet.getRange(i + 1, 2).setValue(novaMatricula);
      sheet.getRange(i + 1, 3).setValue(novoNome);
    }
  }
}

function listarLivros() {
  const sheet = getSheet(ABA_LIVROS);
  const dados = sheet.getDataRange().getValues();
  const livros = [];

  for (let i = 1; i < dados.length; i++) {
    if (!dados[i][0] && !dados[i][1]) continue;
    livros.push({
      id_livro: dados[i][0], titulo: dados[i][1], autor: dados[i][2], editora: dados[i][3], isbn: dados[i][4], categoria: dados[i][5],
      ano: dados[i][6], quantidade_total: parseNumero(dados[i][7]), quantidade_disponivel: parseNumero(dados[i][8]),
      localizacao: dados[i][9], status: dados[i][10], observacoes: dados[i][11]
    });
  }

  return livros;
}

function listarLivrosDisponiveis() {
  return listarLivros().filter(function(l) {
    return parseNumero(l.quantidade_disponivel) > 0 && normalizarTexto(l.status) === "Ativo";
  });
}

function cadastrarLivro(livro) {
  const titulo = normalizarTexto(livro.titulo);
  const quantidadeTotal = parseNumero(livro.quantidade_total);
  if (!titulo) return { sucesso: false, mensagem: "Informe o título do livro." };
  if (quantidadeTotal < 0) return { sucesso: false, mensagem: "A quantidade total não pode ser negativa." };

  const sheet = getSheet(ABA_LIVROS);
  const idLivro = gerarId("LIVRO");

  sheet.appendRow([
    idLivro, titulo, livro.autor || "", livro.editora || "", livro.isbn || "", livro.categoria || "", livro.ano || "",
    quantidadeTotal, quantidadeTotal, livro.localizacao || "", livro.status || "Ativo", livro.observacoes || ""
  ]);

  registrarLog("LIVRO_CADASTRAR", "Título: " + titulo, "Sistema");
  return { sucesso: true, mensagem: "Livro cadastrado com sucesso." };
}

function editarLivro(livro) {
  const idLivro = normalizarTexto(livro.id_livro);
  if (!idLivro) return { sucesso: false, mensagem: "ID do livro não informado." };

  const sheet = getSheet(ABA_LIVROS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === idLivro) {
      const quantidadeDisponivelAtual = parseNumero(dados[i][8]);
      const quantidadeTotalAtual = parseNumero(dados[i][7]);
      const novaQuantidadeTotal = parseNumero(livro.quantidade_total);
      const diferenca = novaQuantidadeTotal - quantidadeTotalAtual;
      const novaQuantidadeDisponivel = quantidadeDisponivelAtual + diferenca;

      if (novaQuantidadeTotal < 0) return { sucesso: false, mensagem: "A quantidade total não pode ser negativa." };
      if (novaQuantidadeDisponivel < 0) return { sucesso: false, mensagem: "A quantidade total não pode ser menor que os exemplares emprestados." };

      sheet.getRange(i + 1, 2).setValue(livro.titulo || "");
      sheet.getRange(i + 1, 3).setValue(livro.autor || "");
      sheet.getRange(i + 1, 4).setValue(livro.editora || "");
      sheet.getRange(i + 1, 5).setValue(livro.isbn || "");
      sheet.getRange(i + 1, 6).setValue(livro.categoria || "");
      sheet.getRange(i + 1, 7).setValue(livro.ano || "");
      sheet.getRange(i + 1, 8).setValue(novaQuantidadeTotal);
      sheet.getRange(i + 1, 9).setValue(novaQuantidadeDisponivel);
      sheet.getRange(i + 1, 10).setValue(livro.localizacao || "");
      sheet.getRange(i + 1, 11).setValue(livro.status || "Ativo");
      sheet.getRange(i + 1, 12).setValue(livro.observacoes || "");

      atualizarLivroNosEmprestimos(idLivro, livro.titulo || "");
      registrarLog("LIVRO_EDITAR", "ID: " + idLivro, "Sistema");
      return { sucesso: true, mensagem: "Livro atualizado com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Livro não encontrado para edição." };
}

function excluirLivro(idLivro) {
  idLivro = normalizarTexto(idLivro);
  if (!idLivro) return { sucesso: false, mensagem: "ID do livro não informado." };

  const sheet = getSheet(ABA_LIVROS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === idLivro) {
      const quantidadeTotal = parseNumero(dados[i][7]);
      const quantidadeDisponivel = parseNumero(dados[i][8]);
      if (quantidadeDisponivel < quantidadeTotal) return { sucesso: false, mensagem: "Não é possível excluir livro com empréstimo ativo." };
      sheet.deleteRow(i + 1);
      registrarLog("LIVRO_EXCLUIR", "ID: " + idLivro, "Sistema");
      return { sucesso: true, mensagem: "Livro excluído com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Livro não encontrado para exclusão." };
}

function atualizarLivroNosEmprestimos(idLivro, novoTitulo) {
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();
  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][3]) === normalizarTexto(idLivro)) sheet.getRange(i + 1, 5).setValue(novoTitulo);
  }
}

function listarEmprestimos() {
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();
  const hoje = hojeZerado();
  const emprestimos = [];

  for (let i = 1; i < dados.length; i++) {
    if (!dados[i][0]) continue;
    let status = normalizarTexto(dados[i][8]);
    if (status === "Emprestado" && dados[i][6]) {
      const prazo = new Date(dados[i][6]);
      prazo.setHours(0, 0, 0, 0);
      if (prazo < hoje) status = "Atrasado";
    }

    emprestimos.push({
      id_emprestimo: dados[i][0], matricula: dados[i][1], nome_aluno: dados[i][2], id_livro: dados[i][3], titulo_livro: dados[i][4],
      data_emprestimo: dados[i][5] ? formatarData(dados[i][5]) : "", prazo_devolucao: dados[i][6] ? formatarData(dados[i][6]) : "",
      data_devolucao: dados[i][7] ? formatarData(dados[i][7]) : "", status: status, observacoes: dados[i][9] || ""
    });
  }

  return emprestimos;
}

function registrarEmprestimo(dadosEmprestimo) {
  const matricula = normalizarTexto(dadosEmprestimo.matricula);
  const idLivro = normalizarTexto(dadosEmprestimo.id_livro);
  const prazoDias = parseNumero(dadosEmprestimo.prazo_dias || 7);

  if (!matricula) return { sucesso: false, mensagem: "Informe a matrícula do aluno." };
  if (!idLivro) return { sucesso: false, mensagem: "Selecione um livro." };

  const aluno = buscarAlunoPorMatricula(matricula);
  if (!aluno.encontrado) return { sucesso: false, mensagem: "Aluno não encontrado na base." };

  const sheetLivros = getSheet(ABA_LIVROS);
  const livros = sheetLivros.getDataRange().getValues();

  let linhaLivro = -1;
  let livroSelecionado = null;
  for (let i = 1; i < livros.length; i++) {
    if (normalizarTexto(livros[i][0]) === idLivro) {
      linhaLivro = i + 1;
      livroSelecionado = livros[i];
      break;
    }
  }

  if (!livroSelecionado) return { sucesso: false, mensagem: "Livro não encontrado." };

  const disponivel = parseNumero(livroSelecionado[8]);
  const statusLivro = normalizarTexto(livroSelecionado[10]);

  if (statusLivro !== "Ativo") return { sucesso: false, mensagem: "Este livro não está ativo para empréstimo." };
  if (disponivel <= 0) return { sucesso: false, mensagem: "Livro sem disponibilidade para empréstimo." };

  const dataEmprestimo = new Date();
  const prazoDevolucao = new Date();
  prazoDevolucao.setDate(prazoDevolucao.getDate() + (prazoDias > 0 ? prazoDias : 7));

  const sheetEmprestimos = getSheet(ABA_EMPRESTIMOS);
  sheetEmprestimos.appendRow([
    gerarId("EMP"), aluno.matricula, aluno.nome, livroSelecionado[0], livroSelecionado[1], dataEmprestimo, prazoDevolucao, "", "Emprestado", dadosEmprestimo.observacoes || ""
  ]);

  sheetLivros.getRange(linhaLivro, 9).setValue(disponivel - 1);
  registrarLog("EMPRESTIMO_CADASTRAR", "Aluno: " + aluno.matricula + " | Livro: " + livroSelecionado[0], "Sistema");
  return { sucesso: true, mensagem: "Empréstimo registrado com sucesso." };
}

function editarEmprestimo(dadosEdicao) {
  const idEmprestimo = normalizarTexto(dadosEdicao.id_emprestimo);
  const matricula = normalizarTexto(dadosEdicao.matricula);
  const prazoDias = parseNumero(dadosEdicao.prazo_dias || 7);

  if (!idEmprestimo) return { sucesso: false, mensagem: "ID do empréstimo não informado." };
  if (!matricula) return { sucesso: false, mensagem: "Informe a matrícula do aluno." };

  const aluno = buscarAlunoPorMatricula(matricula);
  if (!aluno.encontrado) return { sucesso: false, mensagem: "Aluno não encontrado." };

  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === idEmprestimo) {
      const statusAtual = normalizarTexto(dados[i][8]);
      if (statusAtual === "Devolvido") return { sucesso: false, mensagem: "Não é possível editar empréstimo já devolvido." };

      const dataBase = dados[i][5] ? new Date(dados[i][5]) : new Date();
      const novoPrazo = new Date(dataBase);
      novoPrazo.setDate(novoPrazo.getDate() + (prazoDias > 0 ? prazoDias : 7));

      sheet.getRange(i + 1, 2).setValue(aluno.matricula);
      sheet.getRange(i + 1, 3).setValue(aluno.nome);
      sheet.getRange(i + 1, 7).setValue(novoPrazo);
      sheet.getRange(i + 1, 10).setValue(dadosEdicao.observacoes || "");
      registrarLog("EMPRESTIMO_EDITAR", "ID: " + idEmprestimo, "Sistema");
      return { sucesso: true, mensagem: "Empréstimo atualizado com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Empréstimo não encontrado para edição." };
}

function registrarDevolucao(idEmprestimo) {
  idEmprestimo = normalizarTexto(idEmprestimo);
  if (!idEmprestimo) return { sucesso: false, mensagem: "ID do empréstimo não informado." };

  const sheetEmp = getSheet(ABA_EMPRESTIMOS);
  const dadosEmp = sheetEmp.getDataRange().getValues();
  let linhaEmp = -1;
  let emprestimo = null;

  for (let i = 1; i < dadosEmp.length; i++) {
    if (normalizarTexto(dadosEmp[i][0]) === idEmprestimo) {
      linhaEmp = i + 1;
      emprestimo = dadosEmp[i];
      break;
    }
  }

  if (!emprestimo) return { sucesso: false, mensagem: "Empréstimo não encontrado." };
  if (normalizarTexto(emprestimo[8]) === "Devolvido") return { sucesso: false, mensagem: "Este empréstimo já foi devolvido." };

  sheetEmp.getRange(linhaEmp, 8).setValue(new Date());
  sheetEmp.getRange(linhaEmp, 9).setValue("Devolvido");

  const idLivro = emprestimo[3];
  const sheetLivros = getSheet(ABA_LIVROS);
  const dadosLivros = sheetLivros.getDataRange().getValues();

  for (let i = 1; i < dadosLivros.length; i++) {
    if (normalizarTexto(dadosLivros[i][0]) === normalizarTexto(idLivro)) {
      const linhaLivro = i + 1;
      const qtdDisponivel = parseNumero(dadosLivros[i][8]);
      sheetLivros.getRange(linhaLivro, 9).setValue(qtdDisponivel + 1);
      break;
    }
  }

  registrarLog("EMPRESTIMO_DEVOLUCAO", "ID: " + idEmprestimo, "Sistema");
  return { sucesso: true, mensagem: "Devolução registrada com sucesso." };
}

function excluirEmprestimo(idEmprestimo) {
  idEmprestimo = normalizarTexto(idEmprestimo);
  if (!idEmprestimo) return { sucesso: false, mensagem: "ID do empréstimo não informado." };

  const sheet = getSheet(ABA_EMPRESTIMOS);
  const dados = sheet.getDataRange().getValues();

  for (let i = 1; i < dados.length; i++) {
    if (normalizarTexto(dados[i][0]) === idEmprestimo) {
      const status = normalizarTexto(dados[i][8]);
      const idLivro = dados[i][3];

      if (status !== "Devolvido") {
        const sheetLivros = getSheet(ABA_LIVROS);
        const dadosLivros = sheetLivros.getDataRange().getValues();

        for (let j = 1; j < dadosLivros.length; j++) {
          if (normalizarTexto(dadosLivros[j][0]) === normalizarTexto(idLivro)) {
            const qtdDisponivel = parseNumero(dadosLivros[j][8]);
            sheetLivros.getRange(j + 1, 9).setValue(qtdDisponivel + 1);
            break;
          }
        }
      }

      sheet.deleteRow(i + 1);
      registrarLog("EMPRESTIMO_EXCLUIR", "ID: " + idEmprestimo, "Sistema");
      return { sucesso: true, mensagem: "Empréstimo excluído com sucesso." };
    }
  }

  return { sucesso: false, mensagem: "Empréstimo não encontrado para exclusão." };
}

function consultarHistoricoAluno(termo) {
  termo = normalizarTexto(termo).toLowerCase();
  if (!termo) return [];

  const emprestimos = listarEmprestimos();
  return emprestimos.filter(function(e) {
    const matricula = normalizarTexto(e.matricula).toLowerCase();
    const nome = normalizarTexto(e.nome_aluno).toLowerCase();
    return matricula.indexOf(termo) !== -1 || nome.indexOf(termo) !== -1;
  });
}

function consultarHistoricoLivro(termo) {
  termo = normalizarTexto(termo).toLowerCase();
  if (!termo) return [];

  const emprestimos = listarEmprestimos();
  return emprestimos.filter(function(e) {
    const idLivro = normalizarTexto(e.id_livro).toLowerCase();
    const titulo = normalizarTexto(e.titulo_livro).toLowerCase();
    return idLivro.indexOf(termo) !== -1 || titulo.indexOf(termo) !== -1;
  });
}


function parseDataBRParaDate(dataStr) {
  if (!dataStr) return null;
  const partes = String(dataStr).split("/");
  if (partes.length !== 3) return null;
  return new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]), 0, 0, 0, 0);
}

function consultarEmprestimosPendentesOrdenados() {
  const lista = listarEmprestimos().filter(function(e) {
    return normalizarTexto(e.status) !== "Devolvido";
  });

  lista.sort(function(a, b) {
    const pa = normalizarTexto(a.status) === "Atrasado" ? 0 : 1;
    const pb = normalizarTexto(b.status) === "Atrasado" ? 0 : 1;
    if (pa !== pb) return pa - pb;

    const da = parseDataBRParaDate(a.prazo_devolucao);
    const db = parseDataBRParaDate(b.prazo_devolucao);
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    return da - db;
  });

  return lista;
}

function obterTop10AlunosPorPeriodo(dataInicioStr, dataFimStr) {
  const dataInicio = converterDataISOParaDate(dataInicioStr);
  const dataFim = converterDataISOParaDate(dataFimStr);
  if (!dataInicio || !dataFim) return { sucesso: false, mensagem: "Informe a data inicial e a data final.", dados: [] };

  dataFim.setHours(23, 59, 59, 999);
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const valores = sheet.getDataRange().getValues();
  const contagem = {};

  for (let i = 1; i < valores.length; i++) {
    const dataEmprestimo = valores[i][5];
    if (!dataEmprestimo) continue;
    const data = new Date(dataEmprestimo);

    if (data >= dataInicio && data <= dataFim) {
      const matricula = normalizarTexto(valores[i][1]);
      const nome = normalizarTexto(valores[i][2]);
      const chave = matricula + "||" + nome;

      if (!contagem[chave]) contagem[chave] = { matricula: matricula, nome: nome, quantidade: 0 };
      contagem[chave].quantidade++;
    }
  }

  const ranking = Object.keys(contagem)
    .map(function(chave) { return contagem[chave]; })
    .sort(function(a, b) { return b.quantidade - a.quantidade; })
    .slice(0, 10);

  return { sucesso: true, dados: ranking };
}

function obterTop10LivrosPorPeriodo(dataInicioStr, dataFimStr) {
  const dataInicio = converterDataISOParaDate(dataInicioStr);
  const dataFim = converterDataISOParaDate(dataFimStr);
  if (!dataInicio || !dataFim) return { sucesso: false, mensagem: "Informe a data inicial e a data final.", dados: [] };

  dataFim.setHours(23, 59, 59, 999);
  const sheet = getSheet(ABA_EMPRESTIMOS);
  const valores = sheet.getDataRange().getValues();
  const contagem = {};

  for (let i = 1; i < valores.length; i++) {
    const dataEmprestimo = valores[i][5];
    if (!dataEmprestimo) continue;
    const data = new Date(dataEmprestimo);

    if (data >= dataInicio && data <= dataFim) {
      const idLivro = normalizarTexto(valores[i][3]);
      const titulo = normalizarTexto(valores[i][4]);
      const chave = idLivro + "||" + titulo;

      if (!contagem[chave]) contagem[chave] = { id_livro: idLivro, titulo: titulo, quantidade: 0 };
      contagem[chave].quantidade++;
    }
  }

  const ranking = Object.keys(contagem)
    .map(function(chave) { return contagem[chave]; })
    .sort(function(a, b) { return b.quantidade - a.quantidade; })
    .slice(0, 10);

  return { sucesso: true, dados: ranking };
}


function listarCategoriasLivros() {
  const livros = listarLivros();
  const mapa = {};
  livros.forEach(function(l) {
    const cat = normalizarTexto(l.categoria);
    if (cat) mapa[cat] = true;
  });
  return Object.keys(mapa).sort();
}

function relatorioLivrosPorCategoria(categoria) {
  const cat = normalizarTexto(categoria);
  const livros = listarLivros();
  if (!cat || cat === "TODAS") return livros;
  return livros.filter(function(l) {
    return normalizarTexto(l.categoria) === cat;
  });
}

function relatorioEmprestimosPorPeriodoStatus(dataInicioStr, dataFimStr, status) {
  const dataInicio = converterDataISOParaDate(dataInicioStr);
  const dataFim = converterDataISOParaDate(dataFimStr);
  if (!dataInicio || !dataFim) {
    return { sucesso: false, mensagem: "Informe data inicial e final.", dados: [] };
  }

  dataFim.setHours(23, 59, 59, 999);
  const filtroStatus = normalizarTexto(status);
  const lista = listarEmprestimos().filter(function(e) {
    const d = parseDataBRParaDate(e.data_emprestimo);
    if (!d) return false;
    const okPeriodo = d >= dataInicio && d <= dataFim;
    const okStatus = !filtroStatus || filtroStatus === "Todos" || normalizarTexto(e.status) === filtroStatus;
    return okPeriodo && okStatus;
  });

  return { sucesso: true, dados: lista };
}

function getDashboard() {
  const livros = listarLivros();
  const emprestimos = listarEmprestimos();
  const hoje = formatarData(new Date());

  const totalLivros = livros.reduce(function(soma, l) {
    return soma + parseNumero(l.quantidade_total);
  }, 0);

  const disponiveis = livros.reduce(function(soma, l) {
    return soma + parseNumero(l.quantidade_disponivel);
  }, 0);

  const emprestados = emprestimos.filter(function(e) {
    return e.status === "Emprestado" || e.status === "Atrasado";
  }).length;

  const atrasados = emprestimos.filter(function(e) {
    return e.status === "Atrasado";
  }).length;

  const devolucoesHoje = emprestimos.filter(function(e) {
    return e.prazo_devolucao === hoje && e.status !== "Devolvido";
  }).length;

  return { totalLivros: totalLivros, disponiveis: disponiveis, emprestados: emprestados, atrasados: atrasados, devolucoesHoje: devolucoesHoje };
}
