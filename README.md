# Acta

Acta is a group board for people who already know each other. One person creates a group and shares a join link. Members log what they actually did. The board moves when standing changes.

This repository is the Acta website only.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Create an account, create a group, and copy the join link. The copied link uses the current page origin, so a local or preview host stays on that host. A second account can open `/join/<token>` in the browser, sign in, and land on `/groups/<groupId>`.

Accounts and groups are stored in `data/acta.sqlite`. That folder is gitignored. It is a local store so this site can run on its own.

## Database

Acta needs its own database later. Do not point this app at the GoDotWebs database. When Acta has its own project, keep each account id as the auth user id so the same account can be used by the Acta software. Do not commit `.env` files or secrets.

## Scoring

A log moves the board only when a critique returns a different standing. The critique is an entailment model (`Xenova/nli-deberta-v3-small`) that reads the log. It is not a word list. The first log downloads the model into `data/models`.

If the model cannot be loaded, the page says “The score could not be worked out.” and the board stays put.

```bash
npm test
npm run critique:check
```
