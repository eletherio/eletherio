# Verificação do `Index.html`

## Resultado rápido
O conteúdo enviado do `Index.html` também foi colado **duas vezes em sequência** (duas ocorrências de `<!DOCTYPE html>`). Isso invalida a página e pode quebrar comportamento de layout/script no Apps Script HTML Service.

## Problemas críticos

1. **Documento HTML duplicado no mesmo arquivo**
   - Há um segundo bloco completo iniciando em `<!DOCTYPE html>` após o fechamento `</html>` do primeiro.
   - Em navegadores, o parser tenta se recuperar, mas o resultado é imprevisível.

2. **Risco de injeção de HTML em mensagens**
   - `mostrarMensagem(id, tipo, texto)` usa `innerHTML` com texto vindo do backend (`res.mensagem`).
   - Se alguma mensagem contiver HTML, ela será interpretada.

3. **Risco de injeção em tabelas**
   - Diversos trechos interpolam valores diretamente em `innerHTML` (ex.: `titulo`, `nome`, `observacoes`), sem sanitização para contexto HTML.

## Pontos que estão bons

- Organização visual e separação por seções (`dashboard`, `alunos`, `livros`, `emprestimos`, `consultas`, `rankings`).
- Fluxo de atualização do front está coerente após operações CRUD.
- Uso de `google.script.run.withSuccessHandler(...)` está correto no padrão Apps Script.

## Correções recomendadas

1. **Remover a segunda cópia inteira do `Index.html`.**
2. **Criar função de escape para HTML** e aplicar em todo conteúdo renderizado em tabelas.
   - Exemplo: converter `& < > " '` antes de inserir no `innerHTML`.
3. **Trocar mensagens para `textContent` quando possível** (evita execução de HTML acidental).
4. **Manter `escaparParaJS` apenas para parâmetros de `onclick`**, não para renderização de células HTML.

## Checklist de validação após ajuste

1. Login e logout.
2. Renderização das tabelas sem caracteres quebrados (aspas, acentos, `<`, `>`).
3. Inclusão/edição/exclusão em alunos, livros e empréstimos.
4. Rankings e históricos por período.
5. Verificar console do navegador sem erros de parse HTML/JS.
