# ATLAS

Gestão do pátio de empilhadores (STILL). App Base44 em React + Vite: o que se
envia para o GitHub aparece no Base44 Builder.

## Regra principal: ATLAS e ACTA andam juntos

Este repositório tem um gémeo, o **ACTA Hub** (`ageofph-lgtm/acta`), clonado
daqui a 28/09/2026 para ser a versão de demonstração e venda. As duas apps
partilham o mesmo código, com outra marca.

Qualquer alteração pedida faz-se **nos dois repositórios**:

- o mesmo ramo nos dois, com a mesma alteração adaptada aos nomes de cada um;
- **um PR em cada repositório**, cada um com uma ligação para o seu par;
- quem faz os merges é o dono, não o Claude;
- testes e lint corridos nos dois antes de enviar.

Se uma alteração só fizer sentido num dos dois, diz-se isso ao dono **antes**
de a fazer, e não se faz no outro sem ele pedir.

### Nomes que mudam de um lado para o outro

| ATLAS | ACTA |
|---|---|
| `ATLAS` (textos) | `ACTA Hub` (textos), `ACTA` (curto) |
| `src/components/atlas/` | `src/components/acta/` |
| `base44/functions/atlasToWatcher` | `base44/functions/actaToWatcher` |
| `atlas-theme`, `atlas-shell` | `acta-theme`, `acta-shell` |

### Diferenças de propósito (não sincronizar)

- **Marca:** logótipo, temas e cores (`index.css`, `tailwind.config.js`,
  `ThemeSwitcher`, `useTheme`), ícones e manifesto da PWA, ecrã de carregamento.
- **Utilizadores:** o ATLAS tem os emails reais da equipa STILL (`acessos.js`);
  o ACTA tem contas fictícias `@acta.example`. Os nomes nos testes seguem o
  mesmo padrão.
- **Famílias de modelo:** o ATLAS usa a nomenclatura STILL (RX20, RX60, EXV…);
  o ACTA usa tipos genéricos (CE, CT, RT…). Os números de série de exemplo
  também diferem.
- **Oficina:** o ATLAS fala em "Watcher" e "FrotaACP"; o ACTA diz "oficina" e
  "ordem de serviço", porque não assume o sistema do cliente.

### Só no ATLAS, por decisão do dono

O ACTA **não** leva, por agora:

- a escolha da cor do cone no UTS (vermelho/amarelo) e a etiqueta "UTS";
- as opções Recon Bronze/Prata no modal de tarefas da autorização.

Alterações a estas partes fazem-se só aqui. Não se levam para o ACTA sem o
dono pedir.

## Comandos

```bash
npm test        # vitest
npm run lint    # eslint
BASE44_LEGACY_SDK_IMPORTS=true npx vite build   # sem a variável, o build falha em @/entities
```

## Convenções

- Português de Portugal em textos, comentários e mensagens de commit.
- Os comentários explicam o porquê, e registam o que foi medido quando a
  decisão veio de uma medição.
- As entidades do Base44 estão em `base44/entities/*.jsonc`.
