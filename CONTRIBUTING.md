# Guía de Contribución & Estándar de Commits / Contributing Guide

*Read this in other languages: [Español](#guía-en-español) | [English](#english-guide)*

---

<a name="guía-en-español"></a>
## 🇪🇸 Guía en Español

¡Gracias por contribuir a **Vyú**! Para mantener un historial de cambios limpio, trazable y automatizable, requerimos el estándar de [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/).

### 1. Formato de Mensaje de Commit

```text
<tipo>(<alcance opcional>): <descripción corta en imperativo>

[cuerpo descriptivo opcional explicando el porqué del cambio]

[pie(s) de página opcional, ej. referencias a issues o BREAKING CHANGE]
```

### 2. Tipos de Commit Permitidos

| Tipo | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `feat` | Una nueva característica o funcionalidad para el usuario | `feat(canvas): add freehand pencil smoothing` |
| `fix` | Corrección de un error o bug | `fix(sync): resolve offset drift during rapid zoom` |
| `docs` | Modificaciones o adiciones en documentación | `docs(readme): add bilingual documentation links` |
| `style` | Cambios de formato o estilo visual (CSS/sangrías) sin impacto lógico | `style(toolbar): refine dark theme dropdown borders` |
| `refactor` | Refactorización de código sin añadir funcionalidades ni reparar bugs | `refactor(db): isolate indexeddb operations into helper` |
| `perf` | Optimización de rendimiento | `perf(pixelmatch): offload diff computation to web worker` |
| `test` | Adición o corrección de tests unitarios o e2e | `test(qa): add cross-browser canvas test cases` |
| `chore` | Actualización de dependencias, scripts de build o configuración | `chore(deps): update express to 4.19.2` |
| `ci` | Modificaciones en flujos de CI/CD (GitHub Actions) | `ci(pages): update deployment action runner` |

### 3. Alcances Recomendados (`scopes`)
* `visualizer`: Área del visualizador y sincronización de paneles.
* `canvas`: Capa de dibujo de anotaciones vectoriales.
* `engine`: Motor de cálculo diferencial (`pixelmatch`, clustering BFS).
* `sidebar`: Barra lateral, ajustes, historial y carga.
* `export`: Generación y descarga de comparativas enfrentadas.
* `storage`: Persistencia en IndexedDB.
* `docker`: Configuración de contenedor y Dockerfile.

---

<a name="english-guide"></a>
## 🇺🇸 English Guide

Thank you for contributing to **Vyú**! To maintain a clear, traceable, and automated changelog, all contributions must strictly adhere to the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.

### 1. Commit Structure

```text
<type>(<optional scope>): <short summary in imperative mood>

[optional body explaining rationale and motivation]

[optional footer(s), e.g., Closes #12, BREAKING CHANGE: ...]
```

### 2. Standard Commit Types
* `feat`: A new feature for the end-user.
* `fix`: A bug fix.
* `docs`: Documentation-only updates.
* `style`: Code styling, formatting, CSS tweaks with no logic changes.
* `refactor`: Refactoring code without behavioral alterations.
* `perf`: Performance improvements.
* `test`: Adding or maintaining test suites.
* `chore`: Build scripts, dependencies, project housekeeping.
* `ci`: CI/CD workflows and automated pipelines.

### 3. Example Pull Request & Commit Flow
```bash
git checkout -b feat/canvas-polygon-tool
# Make code adjustments
git commit -m "feat(canvas): implement polygon selection tool with live preview"
git push origin feat/canvas-polygon-tool
```
