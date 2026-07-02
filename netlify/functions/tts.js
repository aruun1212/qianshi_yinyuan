const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

// Netlify Function: /api/tts?text=名字&voice=zh-CN-YunxiNeural  (经 netlify.toml 重定向)
// 返回 audio/mpeg (base64)。微软 Edge 免费朗读服务，无需 API key。
exports.handler = async (event) => {
	const cors = {
		"Access-Control-Allow-Origin": "*",
		"Access-Control-Allow-Methods": "GET, OPTIONS"
	};
	if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors };

	const q = event.queryStringParameters || {};
	const text = (q.text || "").toString().trim().slice(0, 40);
	if (!text) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "missing text" }) };
	const voice = (q.voice || "zh-CN-YunxiNeural").toString();

	try {
		const tts = new MsEdgeTTS();
		await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
		const result = tts.toStream(text);
		const stream = result && result.audioStream ? result.audioStream : result;

		const chunks = [];
		await new Promise((resolve, reject) => {
			stream.on("data", (c) => chunks.push(c));
			stream.on("end", resolve);
			stream.on("close", resolve);
			stream.on("error", reject);
		});
		const buf = Buffer.concat(chunks);
		if (!buf.length) throw new Error("empty audio");

		return {
			statusCode: 200,
			headers: { ...cors, "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=86400" },
			body: buf.toString("base64"),
			isBase64Encoded: true
		};
	} catch (e) {
		return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String((e && e.message) || e) }) };
	}
};
