# OpenClaw Sentinel Free-First Router

![OpenClaw Sentinel Free-First Router: Anfrage, Entscheider und Modellprofil](docs/assets/readme-hero.svg)

[← Sprachauswahl](README.md) · [English](README.en.md)

**Ein installierbarer, anbieterunabhängiger Modellrouter für OpenClaw.**

Das Plugin arbeitet am Hook `before_model_resolve`. Ein konfigurierter, mit Chat-Completions kompatibler Entscheider ordnet den aktuellen Prompt einer Fähigkeitsstufe von 1 bis 3 zu und liefert einen Vertrauenswert. Der Router wählt unter den dafür geeigneten konfigurierten Profilen das mit dem niedrigsten `costRank`. Jedes Profil kann auf ein bereits in OpenClaw eingerichtetes Modell zeigen.

Schlägt der Entscheider fehl, läuft er in ein Timeout, antwortet ungültig oder ist unsicher, gibt das Plugin keine Überschreibung zurück. OpenClaw wählt das Modell dann wie gewohnt. Das gilt auch bei Anhängen, zu langen Prompts und ausgenommenen Agenten.

## Installieren

Lade das `.tgz`-Paket von [Releases](https://github.com/lesecuritae/openclaw-sentinel-free-first-router/releases) herunter und führe aus:

```bash
openclaw plugins install ./openclaw-sentinel-free-first-router-0.1.0.tgz
openclaw plugins enable openclaw-sentinel-free-first-router
```

Erst mit konfigurierten Profilen und Entscheider wird geroutet. Für `before_model_resolve` brauchen separat installierte Plugins `hooks.allowConversationAccess: true`. Prüfe diese Berechtigung: Der Entscheider erhält den aktuellen Prompt. Details stehen in der [OpenClaw-Dokumentation der Hooks](https://docs.openclaw.ai/plugins/hooks/prompt-and-session).

## Konfigurieren

Ergänze dieses Beispiel in deiner OpenClaw-Konfiguration und ersetze alle Platzhalter. Es enthält keinen funktionierenden Anbieter-Endpunkt und keine Zugangsdaten.

```json5
{
  plugins: {
    entries: {
      "openclaw-sentinel-free-first-router": {
        enabled: true,
        hooks: { allowConversationAccess: true },
        config: {
          profiles: [
            { id: "economy", provider: "your-provider", model: "your-economy-model", maxTier: 1, costRank: 0 },
            { id: "capable", provider: "your-provider", model: "your-capable-model", maxTier: 3, costRank: 20 }
          ],
          decider: {
            endpoint: "https://your-decider.example/v1/chat/completions",
            model: "your-decider-model",
            apiKeyEnv: "ROUTER_DECIDER_KEY",
            timeoutMs: 4000,
            maxPromptChars: 3000
          },
          minConfidence: 0.7,
          excludedAgents: ["pinned-agent"]
        }
      }
    }
  }
}
```

Setze `ROUTER_DECIDER_KEY` in der Gateway-Umgebung, nicht in diesem Repository. Nur bei einem Endpunkt ohne Anmeldung kannst du `apiKeyEnv` weglassen. Der Endpunkt muss HTTPS verwenden; HTTP ist nur für Loopback erlaubt. Stufe 1 steht für Routinearbeit, Stufe 2 für mittlere und Stufe 3 für komplexe Aufgaben. `costRank` ist eine selbst festgelegte Reihenfolge, kein aktueller Preis.

Der Entscheider muss eine Chat-Completions-Anfrage annehmen und in `choices[0].message.content` einen JSON-Text wie `{"requiredTier":1,"confidence":0.9}` zurückgeben. Der Router akzeptiert nur die Stufen 1–3 und übernimmt niemals Anbieter- oder Modellnamen aus der Antwort des Entscheiders.

## Datenschutz und Grenzen

- Nur begrenzter Prompt-Text geht an den konfigurierten Entscheider. Prompts mit Anhängen oder mehr als `maxPromptChars` Zeichen werden nicht gesendet.
- Logs enthalten Stufe, Profil-ID und Vertrauenswert oder einen allgemeinen Grund für den Rückfall. Sie enthalten keine Prompts, Antworttexte, Tokens oder Zugangsdaten.
- Das Plugin wählt vor einem Durchlauf ein Modell. Es wiederholt keinen fehlgeschlagenen Modellaufruf und erzwingt kein Ausgabenlimit.
- „Free-first“ ist eine Routing-Präferenz. Kostenlose Kontingente, Preise und Modellqualität können sich ändern.

## Entwickeln

```bash
npm run build
npm test
npm run pack:check
```

## Unterstützung

Das Plugin ist frei nutzbar. Wer die weitere Entwicklung unterstützen möchte, kann Tarnkappe.info freiwillig Monero spenden. [Per Monero-Wallet spenden](monero:83WjjKs4ijKChStc9GPrpZYa9DXYpHmbSeVipJrQSzMnRdmYtFE4K5D7ff7BsrTDa8TTZvJmAWivgWLEcJpULQ79KpRX8ik). Für die Installation ist keine Spende erforderlich.

```text
83WjjKs4ijKChStc9GPrpZYa9DXYpHmbSeVipJrQSzMnRdmYtFE4K5D7ff7BsrTDa8TTZvJmAWivgWLEcJpULQ79KpRX8ik
```

Das Paket enthält JavaScript unter `dist/` und ein natives `openclaw.plugin.json`-Manifest. Es steht unter der MIT-Lizenz; siehe [LICENSE](LICENSE).
