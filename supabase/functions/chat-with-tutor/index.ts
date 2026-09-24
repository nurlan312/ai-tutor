import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

export default {
  fetch: withSupabase({ auth: ["user"] }, async (req, ctx) => {
    const { message, language } = await req.json();

    if (!message || !language) {
      return Response.json({ error: "message и language обязательны" }, { status: 400 });
    }

    const user = ctx.userClaims;
    if (!user) {
      return Response.json({ error: "Не авторизован" }, { status: 401 });
    }

    const langName = language === 'en' ? 'английском' : 'кыргызском';

    const systemPrompt = `Ты — дружелюбный ИИ-учитель ${langName} языка. Ученик пишет тебе на ${langName} языке, чтобы практиковаться.
Твои задачи:
- Поддерживай диалог естественно, как настоящий учитель
- Если ученик допустил ошибку (грамматика, лексика) — мягко поправь его, объясни почему, покажи правильный вариант
- Отвечай на русском языке объяснения ошибок, но сам диалог веди на ${langName}
- Будь кратким и по делу, не читай лекции`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemPrompt}\n\nСообщение ученика: ${message}` }] }],
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini error:", errorText);
      return Response.json({ error: "Ошибка ИИ-сервиса" }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Извини, не удалось ответить.";

    await ctx.supabase.from("chat_messages").insert([
      { user_id: user.id, language, role: "user", content: message },
      { user_id: user.id, language, role: "assistant", content: replyText },
    ]);

    return Response.json({ reply: replyText });
  }),
};
