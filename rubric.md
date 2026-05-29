# Rubric — barème de notation du benchmark Koverstar

> Définit **comment** on note, et ce que « figurer parmi les pointures » veut dire concrètement.
> Deux couches : **craft** (notée par agent, jugement) + **objectif** (PageSpeed Insights, automatique).
> Aligné sur le barème de jury Awwwards (Design / Usability / Creativity / Content) + un plancher de performance.

---

## Couche A — Craft (notée par agent, 0–10 par axe)

Source de preuve : visite live + WebFetch (HTML/structure) + fiches Awwwards (tags techno, notes jury) + tutoriels Codrops. Noter **honnêtement, avec preuve**. En cas de doute → note basse + `?`.

| Axe | Poids | Ce qu'on regarde | 0–3 | 4–6 | 7–8 | 9–10 |
|-----|-------|------------------|-----|-----|-----|------|
| **1. Motion & scroll** | 25 % | Smooth scroll, reveals scroll-driven, parallax matière, pin / scroll horizontal, transitions de page, micro-interactions | Statique, sauts | Quelques transitions CSS | Lenis + reveals + parallax cohérents | Scroll = moteur narratif, signature mémorable (sen-knife, Cartier) |
| **2. Composition & layout** | 15 % | Whitespace, rythme éditorial, grille, dominance photo, hiérarchie | Chargé / générique | Propre mais convenu | Éditorial, photo XL, respire | Composition d'auteur, pacing maîtrisé |
| **3. Typographie** | 10 % | Pairing, hiérarchie, détails (ligatures, optical sizing, échelle) | Système par défaut | Correcte | Soignée, hiérarchie claire | Typo signature, détails fins |
| **4. Éditorial & narration** | 15 % | Storytelling, qualité de copy, récit vs fiche produit, ton de marque | Copy fonctionnel | Descriptif | Récit, voix de marque | Narration immersive (deVOL « STEP INSIDE ») |
| **5. Originalité & signature** | 15 % | Moments mémorables (preloader, footer, curseur), distinctivité | Template | 1 idée propre | Plusieurs signatures | Identité forte, inoubliable |
| **6. Ancrage métier & conversion** | 20 % | Le craft sert-il le business : produit lisible, parcours de conversion, clarté grand public | Beau mais gratuit/abstrait | Métier présent | Clair + CTA cohérents | Craft **au service** de la conversion, zéro perte de lisibilité |

**Score craft** = Σ (note_axe × poids) → /10.

> Axe 6 (poids 20 %) est volontairement lourd : Koverstar vise un **public grand public breton**, pas un jury créatif uniquement. Un site sublime mais illisible pour un client cuisine est un échec métier.

---

## Couche B — Objectif (PageSpeed Insights, automatique)

Collecté par `run-benchmark.mjs`, stratégie **mobile** par défaut (priorité Google + cas le plus dur).

| Axe | Source | Seuil « bon » | Seuil « pointure » |
|-----|--------|---------------|--------------------|
| **Performance** | catégorie PSI 0–100 | ≥ 70 | ≥ 90 |
| **SEO** | catégorie PSI 0–100 | ≥ 90 | 100 |
| **Accessibilité** | catégorie PSI 0–100 | ≥ 90 | ≥ 95 |
| **Best practices** | catégorie PSI 0–100 | ≥ 90 | 100 |
| LCP | lab | < 2,5 s | < 2,0 s |
| CLS | lab | < 0,1 | < 0,05 |
| TBT | lab | < 200 ms | < 100 ms |

**Score objectif** = moyenne des 4 catégories PSI → /100 → /10.

> Note : les sites les plus « craft » (Cartier, certains studios) sacrifient souvent la perf (assets lourds, WebGL). C'est le **trade-off** que le benchmark rend visible. Koverstar peut gagner en cumulant craft **et** perf (Next static + images optimisées).

---

## Score global & seuil « on y figure »

**Global (0–10) = 0,65 × Score craft + 0,35 × Score objectif**

Le craft domine (c'est ce qui fait le niveau Awwwards), mais l'objectif compte (Awwwards pénalise une perf/a11y faible ; Google aussi).

### Définition de « figurer parmi les pointures » (Definition of Done)
Koverstar « y figure » quand **toutes** ces conditions sont vraies, deux passes consécutives :
1. **Global ≥ 8,0** (zone SOTD/nominee Awwwards).
2. **Aucun axe objectif < 70** (pas de beau site qui rame).
3. **Score craft ≥ 8,0** (parité de craft avec le top du panel).
4. **Rang ≤ 3** sur le composite objectif du panel covering/cuisine (hors outlier luxe Cartier).

### Cross-check barème Awwwards officiel (indicatif)
Design 40 % · Usability 30 % · Creativity 20 % · Content 10 % · (Mobile pris en compte). SOTD ≈ 8,0+. Notre Global s'en approche en concentrant Design/Creativity dans le craft et Usability dans l'objectif + axe 6.

---

## Discipline de notation
- **Preuve obligatoire** : chaque note craft cite un élément observé (techno, pattern, capture mentale). Pas de note « au feeling ».
- **Honnêteté radicale** : sur-noter Koverstar ruine l'outil. Mieux vaut un écart visible à combler qu'un faux 9.
- **Stabilité concurrents** : les notes craft des concurrents ne bougent qu'en cas de refonte. Le cron re-note surtout **Koverstar** (on suit NOTRE progression) + détecte les refontes.
- **Outlier luxe** : Cartier sert de plafond de référence, exclu du rang cible (budget/contexte hors-catégorie).
