const ARK_BASE = "https://ark.cn-beijing.volces.com/api/v3";

export interface ExtractedFeatures {
  basic: { gender: string; ethnicity: string; age: string };
  hair: {
    color: string;
    length: string;
    texture: string;
    volume: string;
    coverage: string;
    fringe: string;
    accessories: string;
  };
  ears: { visible: boolean; note: string };
  eyes: { eyelid: string; size: string; shape_gaze: string; color: string };
  expression: { type: string; personality: string };
  face_skin: { face_shape: string; skin_tone: string; skin_detail: string };
  distinctive: string[];
}

export const EXTRACTION_PROMPT = `仔细观察这张童年照片中的人物，只输出一个 JSON 对象（不要任何其他文字、不要 markdown 代码块）。

规则：
- 所有描述按照片实际观察，不要按族裔套刻板印象。
- 肤色（skin_tone）只从照片读取，从这个尺度里选并可微调描述：瓷白冷调 / 白皙暖调 / 白皙偏粉冷调 / 自然浅麦 / 小麦色 / 蜜糖色 / 棕色 / 深棕色。禁止默认"白皙"，禁止提亮。
- 发型长度具体到参照物（如：发尾在耳朵上方 / 齐耳 / 齐下巴 / 过肩）。
- 发型必须描述出"整体剪影"：蓬松度（volume）和头发与耳朵的遮挡关系（coverage）是必填项，这两项决定发型像不像，禁止省略。
- 一切左右不对称的特征（刘海方向、露出哪只耳朵、发缝偏侧、痣的位置）都必须用"本人视角"描述并附"（即画面左/右侧）"双重锚定，例如"露出本人右耳（即画面左侧）"。
- 如实评估五官，不要奉承：你的任务是还原，不是夸赞。
- 眼睛大小以同龄儿童的平均水平为基准：儿童眼睛在脸上占比天然显大，这不算"偏大"；只有明显超过同龄平均才写"偏大"，拿不准一律写"适中"。
- distinctive 里禁止出现"大眼睛/眼睛偏大"类条目（会导致生成时放大眼睛），除非眼睛确实异常突出到是这张脸的第一印象。
- distinctive 里只放这个孩子最偏离普通小孩平均长相、最有辨识度的 2-3 个特征（如特别大的耳朵、蓬乱的头发、明显的红脸蛋、雀斑），普通特征不要放。
- 表情如实反映且必须精确区分笑容类型，禁止泛泛写"微笑"：抿嘴微笑（闭嘴不露齿、腼腆）/ 露齿微笑 / 咧嘴大笑 / 不笑，按照片选一种明确写出。

JSON 结构：
{
  "basic": { "gender": "女孩|男孩", "ethnicity": "东亚|欧美|中东|非裔|拉美|南亚|混血等", "age": "约X-X岁" },
  "hair": { "color": "", "length": "", "texture": "直发|大波浪卷|小卷|自然卷等卷型", "volume": "蓬松炸开|自然蓬松有体积|服帖贴头皮", "coverage": "头发与耳朵脸颊的关系，如'两侧头发松散垂下盖住耳朵'或'露出双耳'", "fringe": "", "accessories": "无 或 具体描述" },
  "ears": { "visible": true, "note": "大小形状；普通就写'正常'" },
  "eyes": { "eyelid": "单眼皮|双眼皮|内双", "size": "偏大|适中|偏小", "shape_gaze": "", "color": "" },
  "expression": { "type": "", "personality": "" },
  "face_skin": { "face_shape": "", "skin_tone": "", "skin_detail": "腮红/雀斑等，无则'无'" },
  "distinctive": ["", ""]
}`;

export function buildGenerationPrompt(
  f: ExtractedFeatures,
  hasSourcePhoto = false
): string {
  const parts: string[] = [];

  if (hasSourcePhoto) {
    parts.push(
      "把输入照片中的孩子演绎成一张可爱的大头贴贴纸。" +
        "构图规则（最高优先级，与照片无关）：照片只提供这个孩子的长相，绝不参考照片的构图、姿势、取景和衣着。" +
        "输出永远是一个悬浮在纯白背景上的'剪出来的头'——下巴边缘就是内容的结束，" +
        "绝对没有脖子、没有肩膀、没有衣领、没有任何衣服和身体，无论照片里拍到了什么。" +
        "呈现的是这个孩子3-4岁幼童时期的样子（最高优先级）：" +
        "不管照片里的孩子几岁，都要低龄化成奶萌幼童——更圆更肉的婴儿肥脸颊、饱满的额头、幼态的五官比例、软糯的气质。" +
        "照片是长相的参考基准：必须保留这个人的五官特征和神韵，家人一眼认出'这就是TA小时候'。" +
        "发型跟随照片的样式（颜色、卷直、长短、刘海），但画得更柔软细腻，像幼童的胎毛发质。" +
        "这个孩子最有辨识度的特征要比照片里更明显：" +
        "笑眼就让眼睛弯得更明显，耳朵大就让耳朵更突出，有酒窝就让酒窝更深，头发乱翘就翘得更俏皮，卷发就让卷卷的质感更明显更可爱。" +
        "发型是最重要的辨识特征之一，卷直属性绝对不能改变：照片是卷发就必须画成卷发（卷度只能比照片更明显、绝不能变直变顺），直发也绝不能画成卷发。" +
        "耳朵是否露出完全跟随照片：照片里头发盖住耳朵，头像里就同样盖住，绝不凭空画出照片里看不见的耳朵；只有照片里本来就露出且确实显眼的耳朵才做突出。" +
        "完整的头部（包含全部头发轮廓）居中放置在纯白色背景上，四周留白，无脖子无肩膀无身体，像一张剪出来的头部贴纸。" +
        `${f.basic.ethnicity}${f.basic.gender}。`
    );
  } else {
    parts.push(
      "一张可爱幼童的大头贴贴纸，完整的头部（包含全部头发轮廓）居中放置在纯白色背景上，" +
        "头部只占画面中央约50%，四周大量留白，无脖子无肩膀无身体，像一张剪出来的头部贴纸。" +
        `${f.basic.ethnicity}${f.basic.gender}，${f.basic.age}。`
    );
  }

  let hair =
    `发型（最重点）：${f.hair.color}的头发，${f.hair.length}，${f.hair.texture}，${f.hair.volume}，${f.hair.coverage}；${f.hair.fringe}。`;
  if (f.hair.accessories && f.hair.accessories !== "无") {
    hair += `戴着${f.hair.accessories}。`;
  }
  if (f.ears.visible) {
    hair += `耳朵露出，${f.ears.note === "正常" ? "大小正常" : f.ears.note}。`;
  }
  hair +=
    "发型的轮廓、蓬松度、卷直属性、遮耳关系必须严格按上述描述还原：不要改变发型，不要把卷发画直或画顺滑，不要把头发梳整齐、梳服帖或扎起来，蓬松就画蓬松，卷就画卷，盖住耳朵就盖住耳朵。";
  parts.push(hair);

  parts.push(
    `眼睛（重点）：${f.eyes.eyelid}，眼睛${f.eyes.size}、${f.eyes.color}，${f.eyes.shape_gaze}。` +
      "眼睛的大小和形状严格按此描述还原，绝对禁止放大眼睛或美化眼型：写偏小就画偏小，单眼皮就画单眼皮，这是还原不是美颜。"
  );

  parts.push(
    `表情（重点）：${f.expression.type}，${f.expression.personality}的感觉。` +
      "严格保持照片中笑容的原样幅度：抿嘴笑就闭着嘴完全不露牙齿，露齿笑才露出牙齿，绝不放大笑容。"
  );

  let skin = `肤色（按照片忠实还原）：${f.face_skin.skin_tone}。${f.face_skin.face_shape}`;
  if (f.face_skin.skin_detail && f.face_skin.skin_detail !== "无") {
    skin += `，${f.face_skin.skin_detail}`;
  }
  skin += "，皮肤细腻有真实儿童肌理。";
  parts.push(skin);

  if (f.distinctive.length > 0) {
    parts.push(
      `特别注意（重点强调，要比照片中呈现得更明显）：${f.distinctive.join("；")}。`
    );
  }

  parts.push(
    "整体氛围（重点）：软萌可爱的幼儿感——肉嘟嘟的婴儿肥脸颊、柔软带绒毛感的发丝、奶萌天真的气质，" +
      "像让人想捏一下脸的小娃娃，绝不能有成熟感或大人感；但注意：可爱来自氛围和肉感，五官的大小形状仍严格忠实于上述描述，不靠放大眼睛来可爱。" +
      "如果露出牙齿，牙齿要洁白、干净、有健康光泽。" +
      "摄影级写实质感，柔和温暖的影棚奶油光，发丝有细碎绒毛细节，头部边缘干净利落，纯白背景。"
  );

  return parts.join("");
}

interface ArkError {
  error?: { code?: string; message?: string };
}

function arkHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.ARK_API_KEY}`,
  };
}

export async function extractFeatures(
  imageDataUrl: string
): Promise<ExtractedFeatures> {
  const visionModel = process.env.ARK_VISION_MODEL;
  if (!visionModel) {
    throw new Error("VISION_MODEL_NOT_CONFIGURED");
  }

  const res = await fetch(`${ARK_BASE}/chat/completions`, {
    method: "POST",
    headers: arkHeaders(),
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
    }),
  });

  const data = (await res.json()) as ArkError & {
    choices?: { message?: { content?: string } }[];
  };
  if (data.error) {
    throw new Error(`ARK_VISION_ERROR: ${data.error.code} ${data.error.message}`);
  }
  const raw = data.choices?.[0]?.message?.content ?? "";
  const jsonText = raw.replace(/^```(json)?\s*/i, "").replace(/```\s*$/, "");
  return JSON.parse(jsonText) as ExtractedFeatures;
}

export async function generateAvatar(
  prompt: string,
  imageDataUrl?: string
): Promise<string> {
  const model = process.env.ARK_IMAGE_MODEL ?? "doubao-seedream-4-5-251128";

  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${ARK_BASE}/images/generations`, {
      method: "POST",
      headers: arkHeaders(),
      body: JSON.stringify({
        model,
        prompt,
        ...(imageDataUrl ? { image: imageDataUrl } : {}),
        size: "2048x2048",
        response_format: "url",
        watermark: false,
      }),
    });

    const data = (await res.json()) as ArkError & {
      data?: { url?: string }[];
    };

    if (data.error?.code === "ModelNotOpen" && attempt < 3) {
      continue;
    }
    if (data.error) {
      throw new Error(
        `ARK_IMAGE_ERROR: ${data.error.code} ${data.error.message}`
      );
    }
    const url = data.data?.[0]?.url;
    if (url) return url;
  }
  throw new Error("ARK_IMAGE_ERROR: no image returned after retries");
}
