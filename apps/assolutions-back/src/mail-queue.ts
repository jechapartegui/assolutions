import Bottleneck from 'bottleneck';
import { sendMail, MailInput } from './mailer';

const perMinute = Number(process.env.MAIL_MAX_PER_MINUTE ?? 30);
const minTime = Math.ceil(60_000 / Math.max(1, perMinute));

export const mailLimiter = new Bottleneck({
  minTime,           // ≈ 2000ms => ~30/min
  maxConcurrent: 1,  // un envoi à la fois (évite bursts/spam)
});

type QueueItem = MailInput & { attempt?: number };

async function sendWithRetry(item: QueueItem) {
  const attempt = (item.attempt ?? 0) + 1;
  try {
    const info = await sendMail(item);
    return { ok: true as const, info };
  } catch (err: any) {
    // Backoff simple: 1s, 4s, 9s...
    if (attempt < 3) {
      await new Promise(res => setTimeout(res, attempt * attempt * 1000));
      return sendWithRetry({ ...item, attempt });
    }
    return { ok: false as const, error: err };
  }
}

export function queueMail(item: MailInput) {
  return mailLimiter.schedule(() => sendWithRetry(item));
}
