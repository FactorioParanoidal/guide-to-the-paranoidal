# Guide to the Paranoidal

Иллюстрированный интерактивный гайд по сборке Factorio **PARANOIDAL** (2.0, Quality + Elevated Rails) для тех, кто знает только ванильную Factorio. Одна длинная страница, RU/EN, 22 главы, 51 интерактивный виджет, вики-ссылки, глоссарий, поиск, случайные факты, «достижения читателя».

Interactive illustrated guide to the Factorio **PARANOIDAL** modpack for vanilla players. RU/EN.

**Сайт:** https://factorioparanoidal.github.io/guide-to-the-paranoidal/

## Открыть локально

Двойной щелчок по `index.html` (рядом должна лежать папка `assets/`). Работает без сервера и интернета. Язык — кнопки RU/EN или `index.html?lang=en`.

**Одним файлом:** [Releases](../../releases/latest) → `Guide_to_the_Paranoidal.html` (~11 МБ, все картинки и шрифт внутри).
Его же скачивает Paranoidal Launcher и кладёт рядом с игрой. Собрать самому: `python -I tools/release.py` → `dist/`.

## Что где

| Путь | Что это |
|---|---|
| `index.html` | Собранная страница. Руками не редактировать — её пишет `tools/build.py`. |
| `src/` | Исходники: оболочка, главы, стили, виджеты, реестр глав. |
| `data/` | Сгенерированные данные из дампа игры: числа, названия, цвета иконок. |
| `assets/` | Иконки, спрайты, шрифт и элементы интерфейса из игры и модов + `manifest.json` с источниками. |
| `tools/` | Извлечение данных, сборка ассетов, сборка страницы, проверки, скриншоты, релиз одним файлом. |
| `.github/workflows/release.yml` | При пуше в `main` с новой `guide_version` создаёт релиз с `Guide_to_the_Paranoidal.html`. |
| `AGENTS.md` | **Инструкция для агентов**: как устроен гайд, правила фактов и дизайна, обновление и публикация. |
| `CHANGELOG.md`, `IDEAS.md` | История версий и идеи развития. |

## Обновить после изменения сборки

```bash
bash tools/update.sh ../test-runs/<RUN-с-дампом>
```
Подробно — `AGENTS.md`, раздел 7.

Factorio © Wube Software. Графика игры и модов принадлежит их авторам. Гайд некоммерческий.
