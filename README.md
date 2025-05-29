# Árvore Genealógica

Uma aplicação web simples para criar e visualizar árvores genealógicas sem necessidade de cadastro ou instalação.

## Funcionalidades

- Adicione pessoas à sua árvore genealógica com informações básicas
- Estabeleça diferentes tipos de relações: pais, filhos, cônjuges e irmãos
- Visualize a árvore de forma interativa com zoom e navegação
- Salve sua árvore localmente no navegador
- Exporte sua árvore como imagem PNG
- Compartilhe sua árvore através de um código que pode ser importado por outros

## Como usar

1. Abra o arquivo `index.html` em qualquer navegador moderno
2. Comece adicionando a primeira pessoa (pessoa raiz) da árvore
3. Continue adicionando mais pessoas e estabelecendo suas relações
4. Use os controles de zoom para navegar pela árvore
5. Clique em qualquer pessoa para centralizar a visualização nela
6. Use os botões na barra lateral para salvar, carregar ou exportar sua árvore

## Tecnologias utilizadas

- HTML5, CSS3 e JavaScript puro
- D3.js para visualização da árvore
- LocalStorage para armazenamento dos dados
- HTML2Canvas para exportação de imagens

## Estrutura do projeto

- `index.html` - Página principal da aplicação
- `css/styles.css` - Estilos da aplicação
- `js/app.js` - Lógica da aplicação
- `README.md` - Documentação

## Limitações

- Os dados são armazenados apenas no navegador local
- Árvores muito grandes podem ter problemas de visualização em telas pequenas
- A exportação como PNG pode não capturar árvores muito grandes corretamente

## Desenvolvido por

Luis Alves
