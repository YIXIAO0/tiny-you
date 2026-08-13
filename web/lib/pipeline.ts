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
  facial_hair?: string;
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
  "facial_hair": "无 | 有（照片人物有任何胡须、胡茬或唇上下巴的毛发阴影就写'有'）",
  "distinctive": ["", ""]
}`;

interface CuteElement {
  key: string;
  prompt: string;
  requiresTeeth?: boolean;
  girlsOnly?: boolean;
}

const CUTE_ELEMENTS: CuteElement[] = [
  {
    key: "white-sunglasses-low",
    prompt:
      "戴一副白色框的椭圆形小墨镜，低低地滑到鼻尖架着，眼睛从墨镜上方俏皮地看出来",
  },
  {
    key: "black-sunglasses-head",
    prompt: "一副黑色墨镜推在头顶的头发上架着，像个刚从海边回来的小潮人",
  },
  {
    key: "pink-bow",
    prompt: "头顶发间别着一个大大的粉色缎面蝴蝶结，软软的很有质感",
    girlsOnly: true,
  },
  {
    key: "colorful-clips",
    prompt: "头发两侧别着几只彩色小发夹（粉色、黄色、蓝色的小按扣发夹）",
    girlsOnly: true,
  },
  {
    key: "ear-studs",
    prompt: "耳垂上戴着一对小小的爱心耳钉，精致闪亮",
    girlsOnly: true,
  },
  {
    key: "teeth-gems",
    prompt:
      "牙齿上贴着几颗闪闪发光的小钻石牙饰，笑起来牙齿 bling bling 地闪着光",
    requiresTeeth: true,
  },
];

/** Randomly pick 0-2 cute accessory easter eggs; teeth gems only for toothy smiles. */
export function pickCuteElements(showsTeeth: boolean, gender = ""): string[] {
  const isGirl = gender.includes("\u5973");
  const pool = CUTE_ELEMENTS.filter(
    (e) => (!e.requiresTeeth || showsTeeth) && (!e.girlsOnly || isGirl)
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  // At most ONE accessory per portrait — stacking reads as clutter.
  const count = Math.random() < 0.15 ? 0 : 1;
  return shuffled.slice(0, count).map((e) => e.prompt);
}

export function buildGenerationPrompt(
  f: ExtractedFeatures,
  hasSourcePhoto = false,
  cuteElements: string[] = []
): string {
  const parts: string[] = [];

  if (hasSourcePhoto) {
    parts.push(
      "任务：把输入照片中的孩子变回TA三四岁婴幼儿时期的样子，做成可爱的大头贴贴纸。" +
        "最重要的标准：成品必须像一张真实可爱小孩的照片——绝不能像缩小的大人脸，绝不能又老又小。" +
        "两条同时成立：①是同一个人——保留五官特征和神韵，家人一眼认出；" +
        "②年龄明显变小到3-4岁——幼态感来自饱满额头、柔和短小的下巴和柔软肤质，不靠把脸画圆。" +
        "脸型忠实于本人：瘦长脸就是清秀的小瘦脸，圆脸才是圆脸，绝不把瘦脸画圆画宽，禁止大饼脸、禁止双下巴。" +
        "气质忠实于本人：帅气的就是帅气可爱，清秀的就是清秀可爱，漂亮的就是漂亮可爱。" +
        "构图（与照片无关）：纯白背景上一个剪出来的悬浮头部，下巴边缘即内容结束，绝无脖子、肩膀、衣物。" +
        "发型：保留照片的发色与卷直质地，样式是TA小时候会有的自然儿童发型，" +
        "整头发的质地必须一致连贯（绝不能头顶一种质地、两侧另一种），发质是幼儿的细软胎毛感。" +
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

  if (cuteElements.length > 0) {
    parts.push(
      `可爱小彩蛋（要画得精致真实）：${cuteElements.join("；")}。` +
        "只画这一件彩蛋饰品，不能遮挡五官辨识度，不改变发型和长相本身。"
    );
  }

  parts.push(
    "饰品纪律：除了上面明确要求的饰品和照片里本来就有的发饰之外，" +
      "绝对不要自行添加任何其他饰品——严禁鼻钉、项链、纹身贴、多余的眼镜或头饰。"
  );

  parts.push(
    "整体氛围（重点）：软萌可爱的幼儿感——柔软带绒毛感的发丝、柔和的奶萌气质，绝不能有成熟感或大人感；" +
      "绝对没有任何成人特征：嘴唇上方和下巴彻底光洁，无胡子、无胡茬、无绒毛、无青灰色胡茬阴影、无唇上阴影，这些区域肤色与脸颊完全一致均匀；无皱纹、无喉结；" +
      "但注意：可爱来自气质和光线，脸型和五官的大小形状仍严格忠实于上述描述，不把脸画圆、不放大眼睛。" +
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

/** Pass 1 of the i2i pipeline: a single-purpose de-aging transform. */
export const DEAGE_PROMPT =
  "把照片中的人物变回TA三四岁幼童时期的样子——推断这个人小时候真实可能的长相：" +
  "观察TA五官的特征（眼型、眉形、鼻子嘴唇的特点、脸型），把这些特征自然地长在一个真实的3-4岁幼童脸上。" +
  "最重要的标准：成品必须看起来就是一张真实小孩的照片，可爱、软糯、有童真——" +
  "绝不能像一张缩小的大人脸，绝不能'又老又小'，绝不能怪异。" +
  "脸型跟随本人：瘦长脸就是清秀的小瘦脸，圆脸才是圆脸；脸的宽高比例必须自然协调，绝不把脸画宽画扁，禁止大饼脸。" +
  "五官要立体有神采，眼神明亮有灵气。气质跟随本人：帅气的就是帅气可爱的小孩。" +
  "发型：保留照片的发色和卷直质地，但样式换成这个人小时候会有的自然儿童发型，" +
  "整头发的质地必须一致连贯——绝不能头顶一种质地、两侧另一种质地。" +
  "嘴唇上方、嘴角四周和下巴彻底光洁：无胡子无胡茬无绒毛无阴影，肤色与脸颊一致；无皱纹、无喉结。" +
  "纯白背景，画面里只有完整的头部，没有脖子、肩膀和衣物。摄影级写实，不加任何饰品。";

/** Conditional pass 3: surgical facial-hair removal, everything else untouched. */
export const FACE_CLEANUP_PROMPT =
  "只做一件事：把这个小孩嘴唇上方、嘴角四周和下巴的皮肤修得彻底光洁干净——" +
  "去掉所有胡须、胡茬、绒毛和任何青灰色阴影，让这些区域的肤色和脸颊完全一致、均匀、干净。" +
  "除此之外的一切保持原样完全不变：发型、五官、表情、眼神、饰品、构图、纯白背景全部不动。";

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
