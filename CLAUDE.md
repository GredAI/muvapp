# Muvapp — Documentazione per Claude

## Cos'è Muvapp
PWA (Progressive Web App) che guida l'utente negli esercizi delle sue schede di allenamento, esercizio per esercizio e serie per serie, con timer di recupero e un timer a fasi configurabile per allenamenti "a tempo". Include anche il palinsesto dei corsi della palestra (FitActive Castenaso) e un piano settimanale. App single-file: tutto il codice (HTML, CSS, JS) è in `index.html`. Nessun framework esterno.

Nata come costola di Vivenda ma tenuta volutamente **separata** (progetto/repo a parte) per non appesantire Vivenda con la logica di timer/allenamento.

## URL produzione
**https://gredai.github.io/muvapp/** (lo slash finale conta, vedi sezione bug risolti)
Repository: https://github.com/GredAI/muvapp

## File principali
- `index.html` — l'intera app
- `sw.js` — Service Worker (cache name `muvapp-vN`, incrementare a ogni modifica rilevante)
- `manifest.json` — configurazione PWA (**usa URL assolute**, vedi sotto)
- `icon-192.png`, `icon-512.png` — icone PWA generate via script (dumbbell stilizzato arancione su sfondo scuro)

## Come aggiornare l'app
```bash
cd ~/Documents/Muvapp
git add .
git commit -m "descrizione"
git push
```
Poi su iPhone: chiudere del tutto l'app (swipe su dall'app switcher, non solo tornare alla home) e riaprirla con rete attiva — il SW è network-first per l'HTML quindi prende sempre l'ultima versione.

**Branch:** `main` (non `master` come Vivenda — qui non serve il remapping).

## Architettura

### Storage
Tutto in **localStorage** del dispositivo, nessun backend/cloud. Chiavi usate:
- `ac_settings` — `{sound, restDefault}`
- `ac_history` — array di date ISO delle sessioni di allenamento completate
- `gym_calories` — oggetto `{nomeCorso: kcal}`, inserito manualmente dall'utente
- `gym_my_week` — oggetto `{"Giorno|NomeCorso|OraInizio": true}`, selezione personale dei corsi che l'utente intende fare

Backup/ripristino in Impostazioni (⚙️ in home): **Salva backup** scarica un JSON con tutte le chiavi sopra; **Importa backup** le ripristina da file.

**Nota importante:** come per Vivenda, il profilo Home Screen (icona installata) e Safari hanno storage **isolati** su iOS. Svuotare la cache/dati di Safari non cancella i dati della app installata. Per cancellarli davvero serve Impostazioni → Generali → Spazio iPhone → Muvapp → Elimina App.

### Service Worker
- **Network-first per navigazioni/HTML**, **cache-first per il resto** (icone, manifest).
- Tutti i percorsi in `ASSETS` sono relativi (`./index.html` ecc.), mai assoluti — vedi bug risolti.
- Cache name `muvapp-vN`: incrementare la `N` a ogni deploy per invalidare la cache vecchia.

## Modello dati

### ROUTINES (schede di allenamento)
Array di schede, ciascuna con `id`, `title`, `subtitle`, `category` (Petto/Upper Body/Collo/Braccia/Palestra/Riabilitazione), `duration`, `frequency`, `restSeconds` (default recupero), `notes` (array di avvertenze/consigli mostrate col pulsante ℹ️ in sessione), `suggestedDays` (opzionale), `exercises[]`.

Ogni esercizio: `name`, `muscles[]` (nomi muscolo, vedi `MUSCLE_COLORS` per i colori dei pallini), `equip`, `instr`, `sets`, `reps`, `rest` (override opzionale del recupero di default), `load` (carico consigliato, es. "40-60 kg"), `section` (etichetta per raggruppare visivamente, es. "Workout A"), `warmup` (bool, badge "Riscaldamento").

Schede attuali (9): `pettorali-elastici`, `upper-body-elastico`, `programma-collo`, `braccia-elastici`, `sala-pesi-domenica`, `accessori-spalla`, `lassita-lunedi`, `lassita-giovedi`, `lassita-venerdi`.

**Nota sulla scheda `lassita-lunedi`:** l'esercizio "Rotazioni Esterne con Elastico/Cavo" ha ripetizioni stimate (10-12) perché la scheda originale non le riportava — da confermare con l'utente se serve precisione.

### WEEKLY_PLAN (piano settimanale)
7 giorni, ciascuno con `classLabel` (corso FitActive del giorno), `extra` (note/priorità), `routineId` (scheda collegata, opzionale), `cardio`. Mostrato in home come card "Oggi" + pulsante "Vedi la settimana intera".

### GYM_SCHEDULE (palinsesto corsi FitActive Castenaso)
Array di corsi `{day, name, tag, start, end, uncertain?}` per Lun-Sab. Sezione "🏋️ Corsi in Palestra" in home, con tab per giorno, campo kcal editabile per corso (salvato per nome corso, condiviso tra le occorrenze dello stesso corso in giorni diversi), e un cerchietto per aggiungere il corso a "La mia settimana in palestra" (vista separata, raggiungibile col pulsante 📋).

**Attenzione:** molte voci serali (dopo le ~17) sono marcate `uncertain:true` perché trascritte da screenshot con testo piccolo/stilizzato — vanno verificate con l'utente prima di fidarsene del tutto. Il palinsesto reale cambia periodicamente (è già stato aggiornato una volta in questa conversazione): quando l'utente manda uno screenshot nuovo, sostituire l'intero array `GYM_SCHEDULE`.

## Motore sessione allenamento
Flusso a due fasi per ogni serie (per evitare che un tap segni erroneamente una serie come fatta):
1. Bottone mostra **"Inizia Serie N"** → tap → diventa **"Segna Serie N completata"** con un pulsante "Annulla" sotto per tornare indietro senza segnare nulla.
2. Secondo tap → la serie si segna fatta (pallino verde), parte il recupero.

`session.progress` è un array (una voce per esercizio) così navigare avanti/indietro tra esercizi **non** azzera il progresso già fatto (bug risolto, vedi sotto). Pulsante "↺ Reset" per azzerare manualmente il conteggio dell'esercizio corrente.

Timer di recupero: pausa, ±15s, salta. Timer a tempo (⏱️ in sessione): fasi configurabili (spinta/pausa/ritorno/pausa) per ripetizione, utilizzabile su qualsiasi esercizio anche non preconfigurato.

## Problemi risolti (storico)

- **404 su GitHub Pages dall'icona Home Screen**: `manifest.json` aveva `start_url`/`scope` assoluti (`"/"`), che puntavano alla radice del dominio invece che a `/muvapp/` (repo di progetto, non root). Prima tentata la correzione con percorsi relativi (`"./"`), non sufficiente/affidabile su iOS → risolto con **URL assolute complete** (`https://gredai.github.io/muvapp/`) per `start_url`, `scope` e `icons[].src`.
- **Icona Home Screen rimasta "incastrata" sulla versione rotta**: su iOS le app installate hanno uno storage/WebClip isolato che non si pulisce rimuovendo solo l'icona. Soluzione definitiva: Impostazioni → Generali → Spazio iPhone → Muvapp → Elimina App (non solo togliere l'icona), poi riavviare il telefono, poi reinstallare.
- **Icona generica "M" invece del disegno arancione**: causata da `"purpose": "any maskable"` sulle icone del manifest — iOS non gestiva bene il mascheramento con questo disegno (bordi non in "safe zone") e ripiegava su una lettera generica. Rimosso `maskable`, lasciato solo `"purpose": "any"`.
- **Tornando all'esercizio precedente si perdeva il progresso delle serie**: `nextExercise`/`prevExercise` resettavano uno `setIndex` scalare condiviso. Risolto passando a `session.progress[]` (un contatore per esercizio).
- **Tap su "Serie completata" segnava la serie fatta senza conferma**: introdotto il flusso a due fasi (Inizia → Segna completata) descritto sopra.

### Piano coach (EGO Wellness & Fitness, dal 05/11/2026, 7 settimane)
- Schede `coach-w1` (Gambe/Glutei/Tricipiti), `coach-w2` (Dorsali/Femorali), `coach-w3` (Spalle/Bicipiti), categoria "Ego", recupero 50-70", addominali 3×1 min a fine seduta. Il giorno di ogni workout NON è specificato (non collegati a WEEKLY_PLAN).
- `DIET_PLAN` + `openDiet()` / `#view-diet`: schermata "🥗 Piano alimentare" in home (sola lettura): norme, pasti, integrazione, pasto libero.
- `ILLUS` (inline SVG, chiave = nome esercizio): disegno stilizzato macchina/postura mostrato sopra le istruzioni (`#ex-illus`) per i 25 esercizi Ego. Gli altri esercizi non hanno ancora disegni.
- Misure corporee (peso, % grasso, ecc.) volutamente NON nel codice: il repo è pubblico.

## Da fare / in sospeso
- Collegare Workout 1/2/3 ai giorni della settimana (da chiedere all'utente); eventuale check ogni 2 settimane.
- **Immagini illustrative per esercizio** (richiesta dall'utente, non ancora implementata): l'utente vorrebbe un'immagine/disegno che mostri l'esecuzione di ogni esercizio (come nelle schede PNG originali). In questa sessione non è stato possibile generare immagini fotorealistiche (nessun tool di image-gen disponibile) né ricevere le foto originali come file (arrivano solo incollate in chat, non allegate). Opzioni discusse con l'utente: (a) icone/pittogrammi generici per tipo di movimento creati da zero, (b) foto vere fornite dall'utente e collegate una per una, (c) entrambe. Nessuna scelta finale presa — riprendere da qui.
- Verificare con l'utente gli orari del palinsesto corsi marcati `uncertain:true`.
- Valutare se aggiungere un editor in-app per creare/modificare schede (finora rifiutato esplicitamente dall'utente: "solo caricamento", le schede le trascrive Claude da screenshot su richiesta).

## Note importanti
- L'utente lavora da Cowork (sessioni "attività su questo computer") ma queste sono in dismissione dal 6 ottobre 2026 per nuove sessioni — per nuovo lavoro su questo Mac userà Claude Code. Questo file serve come contesto di continuità tra i due strumenti.
- Repository pubblico su GitHub Free: per usare GitHub Pages il repo deve restare **pubblico** (nessun piano gratuito supporta Pages su repo privati). Il codice è visibile, i dati restano solo sul dispositivo.
- Nome del progetto cambiato più volte durante lo sviluppo (AllenaCoach → Movenda → **Muvapp**, definitivo). Se in futuro cambia ancora, aggiornare: `<title>`, `apple-mobile-web-app-title`, `manifest.json` (name/short_name/start_url/scope/icons), `sw.js` (cache name), e questo file.
