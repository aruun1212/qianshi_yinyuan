const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

// GET /api/tts?text=名字&voice=zh-CN-YunxiNeural
// 返回 audio/mpeg。使用微软 Edge 免费朗读服务（无需 API key）。
module.exports = async (req, res) => {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
	if (req.method === "OPTIONS") { res.status(204).end(); return; }

	const q = req.query || {};
	const text = (q.text || "").toString().trim().slice(0, 40);
	if (!text) { res.status(400).json({ error: "missing text" }); return; }
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

		res.setHeader("Content-Type", "audio/mpeg");
		res.setHeader("Cache-Control", "public, max-age=86400");
		res.status(200).send(buf);
	} catch (e) {
		res.status(500).json({ error: String((e && e.message) || e) });
	}
};
