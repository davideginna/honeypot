# La mia dieta

PWA statica (HTML/CSS/JS, nessuna dipendenza) con il piano alimentare per giorno, settimana e mese e un diario del peso.

- Il piano segue il mese corrente; si può fissare un piano dal menu in alto.
- Vista, giorno e piano scelti restano salvati (`localStorage`).
- I pesi inseriti restano solo sul dispositivo; backup con Esporta/Importa.
- Funziona offline (service worker) e si installa da browser ("Aggiungi a schermata Home").

Dati del piano: `data/diet.json`.
