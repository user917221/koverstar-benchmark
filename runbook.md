# Runbook — benchmark Koverstar vs pointures

Harnais de comparaison continue : où se situe Koverstar face au top mondial (craft + perf/SEO/a11y), et suivi de la progression vers « on y figure ».

## Fichiers
| Fichier | Rôle | Qui l'édite |
|---------|------|-------------|
| `targets.json` | Liste des cibles (URLs, catégories). `self:true` = nous. | Toi (ajout/retrait) |
| `rubric.md` | Barème : axes craft + seuils objectifs + def. de « on y figure ». | Rarement |
| `run-benchmark.mjs` | Collecteur objectif PSI (zéro dépendance). Écrit `scores/<date>.json` + régénère `PERF.md`. | — |
| `PERF.md` | **Auto-généré.** Classement objectif de la dernière passe. | ⚠️ ne pas éditer |
| `scores/*.json` | Historique horodaté des passes objectives. | — |
| `REPORT.md` | **Scorecard vivant** : craft + objectif + écart + tendance. | Agent (hebdo) |
| `.env` | `PSI_API_KEY=...` (gitignoré). | Toi (une fois) |

## Lancer à la demande
```bash
cd tasks/benchmark
node run-benchmark.mjs                  # toutes les cibles, mobile
node run-benchmark.mjs --desktop        # stratégie desktop
node run-benchmark.mjs --only=koverstar,coverstyl   # sous-ensemble
```
→ régénère `PERF.md` + ajoute `scores/<date>.json`. Puis un agent met à jour la couche craft + la synthèse de `REPORT.md`.

## Clé API PSI (2 min — débloque la couche objective)
Sans clé, l'API PSI utilise un **quota partagé anonyme** souvent épuisé → `429` (c'est ce qui bloque le premier run). Une clé gratuite résout ça.

1. Va sur https://developers.google.com/speed/docs/insights/v5/get-started → bouton **« Get a Key »** (ou Google Cloud Console → API « PageSpeed Insights API » → Créer une clé).
2. Crée le fichier `tasks/benchmark/.env` :
   ```
   PSI_API_KEY=AIza...ta_clé
   ```
   (le `.env` est gitignoré ; le script le lit automatiquement.)
3. Relance `node run-benchmark.mjs`. Quota gratuit : ~25 000 requêtes/jour, large pour 10 cibles/semaine.

> Alternative sans fichier : `setx PSI_API_KEY "AIza..."` (Windows, persiste pour les futurs shells).

## Automatisation hebdomadaire (cron)
Une tâche planifiée relance le benchmark chaque semaine et met à jour le scorecard. Le prompt du cron est **autonome** (l'agent qui se réveille n'a pas le contexte de cette session) : il dit où est le dossier, lance le script, re-note le craft de Koverstar (pour suivre NOTRE progression), met à jour `REPORT.md` (table de tendance incluse) et livre un résumé.

- **Prérequis** : la machine doit être allumée à l'heure de déclenchement ; la clé PSI dans `.env` (sinon la passe objective sera vide mais le craft sera quand même ré-évalué).
- **Modifier la fréquence / désactiver** : via les outils de tâches planifiées (CronList / CronDelete) ou demande à l'agent.

## Automatisation cloud (GitHub Actions) — recommandé
Le workflow `.github/workflows/benchmark.yml` fait tourner la passe objective **dans le cloud, chaque lundi**, sans dépendre d'aucune machine allumée, et **recommit `PERF.md` + `scores/`** dans le repo.

- **Activer les vraies données** : Settings → Secrets and variables → Actions → New repository secret → nom `PSI_API_KEY`, valeur = ta clé PSI gratuite. Sans secret, la passe tourne quand même (429 géré, PERF.md = « add key »).
- **Lancer à la main** : onglet **Actions** → « Benchmark Koverstar (hebdo) » → **Run workflow**.
- **Périmètre** : couche objective seulement (perf/SEO/a11y/CWV). La notation **craft** reste faite par un agent (tâche locale `koverstar-benchmark-hebdo` ou run manuel) — pense à `git pull` avant de re-noter pour récupérer les dernières données CI.

## Ajouter / retirer une pointure
Édite `targets.json` (un objet par cible : `id`, `name`, `url`, `category`, option `priority`/`note`). Le script et le cron s'adaptent. Pour une nouvelle cible, un agent doit aussi lui attribuer des notes craft dans `REPORT.md`.

## Lire les résultats
- **`REPORT.md`** = la vue d'ensemble (commence par là). TL;DR + scorecard craft + écart + tendance.
- **`PERF.md`** = le détail objectif de la dernière passe (perf/SEO/a11y/CWV + rang).
- **« On y figure »** = critères dans `rubric.md` (Global ≥ 8,0 · craft ≥ 8,0 · plancher objectif 70 · rang ≤ 3), vrais sur 2 passes.
