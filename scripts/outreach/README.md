# gift.ceo outreach launcher

Personalises one letter across a list of real recipients, refuses everything
it should refuse, and sends at a pace a mailbox survives.

    node launch.mjs                       # dry run: prints the plan, sends nothing
    node launch.mjs --limit 50            # dry run, first 50 after filtering
    node launch.mjs --send --limit 50     # transmits, 40s apart by default
    node launch.mjs --send --delay 60     # slower

`--send` is the only thing that transmits. Without it the script prints the
first message exactly as it would leave and stops.

## Before the first run

Three fields in `campaign.json` are deliberately set to `TODO`, and the script
will not start until they are real:

| field | why it is not optional |
|---|---|
| `postalAddress` | US law (CAN-SPAM §7704(a)(5)) requires a valid physical address in the body of every commercial message. Up to $53,088 per message without it. |
| `unsubscribe` | A working way out, honoured within 10 business days. A link or a monitored reply instruction both count. |
| `from` | The address the recipient actually sees. It must be one that can receive the replies and the complaints. |

## The list

`recipients.csv`, with the columns in `recipients.sample.csv`:

    email,first_name,company,title,city,state

**This script does not invent recipients.** With no file it stops and says so.
Addresses have to come from somewhere defensible — people who opted in, a
licensed provider, or published company contacts — because every made-up
address is either a bounce against the sending domain's reputation or a real
stranger who never asked.

A row is dropped, with the reason printed, when the address does not parse,
appears twice, sits in `suppression.txt`, was already written to
`outbox/sent.log` by an earlier run, or is missing a column the template
personalises on. A letter that opens "Hi ," is worse than no letter.

## Sending

`--send` wants `RESEND_API_KEY` in the environment, for a domain with SPF,
DKIM and DMARC published — normally the same domain as `from`.

Do not push fifty cold messages through a personal Gmail. Consumer mailboxes
are rate-limited and reputation-scored as consumer mailboxes; the run that
gets through today is the one that gets the account restricted this week.
That is the whole reason this script wants a sending domain instead.

`outbox/sent.log` is append-only and is read back on every run. It is what
stops an interrupted campaign from mailing the same person twice — deleting a
line from it is how someone gets the letter again.

## Files

    campaign.json          from, subject, and the three compliance fields
    template.txt           the letter; {{first_name}}, {{company}}, any CSV column
    recipients.csv         the list (you supply it)
    recipients.sample.csv  the columns
    suppression.txt        anyone who asked to be left alone, checked every run
    outbox/plan.json       what the last run would send, rewritten each time
    outbox/sent.log        what actually left, append-only
