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
    key: "silver-hoops",
    prompt: "双耳戴着小巧的银色圈形耳环，精致有光泽",
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

export interface FunStyle {
  gaze?: string;
  expr?: string;
  extras: string[];
}

const GAZE_POOL = [
  "眼神明确地看向画面左侧，带出少量眼白，营造'偷偷看'的俏皮感",
  "眼神明确地看向画面右侧，带出少量眼白，营造'偷偷看'的俏皮感",
  "眼睛好奇地微微抬起看向上方，天真探索的神情",
];

const EXPR_POOL = [
  "鼓起两边腮帮、嘟着小嘴，气鼓鼓又软乎乎的可爱样子",
  "抿着嘴憋笑，嘴角上扬眼睛弯弯，一副藏不住笑意的样子",
];

const DECOR_POOL = [
  "腮红明显加重，画成美式复古风的圆圆腮红",
  "一侧脸颊上贴着一枚小小的星星贴纸，红黄蓝细线描边，精致可爱",
  "头部四周飘着少量彩色碎纸片礼花，只出现在头部附近，不贴画面边缘不遮脸",
];

/** Roll the style dice: at most one face twist (gaze OR expression) plus at
 *  most one extra (accessory or decoration). ~35% of rolls stay classic. */
export function pickFunStyle(showsTeeth: boolean, gender = ""): FunStyle {
  const isGirl = gender.includes("\u5973");
  const fun: FunStyle = { extras: [] };
  if (Math.random() < 0.35) return fun;
  const twist = Math.random();
  if (twist < 0.45) {
    fun.gaze = GAZE_POOL[Math.floor(Math.random() * GAZE_POOL.length)];
  } else if (twist < 0.7) {
    fun.expr = EXPR_POOL[Math.floor(Math.random() * EXPR_POOL.length)];
  }
  if (Math.random() < 0.75) {
    const pool = [
      ...CUTE_ELEMENTS.filter(
        (e) => (!e.requiresTeeth || showsTeeth) && (!e.girlsOnly || isGirl)
      ).map((e) => e.prompt),
      ...DECOR_POOL,
    ];
    fun.extras.push(pool[Math.floor(Math.random() * pool.length)]);
  }
  return fun;
}

export function buildGenerationPrompt(
  f: ExtractedFeatures,
  hasSourcePhoto = false,
  fun: FunStyle = { extras: [] }
): string {
  const parts: string[] = [];

  if (hasSourcePhoto) {
    parts.push(
      "【任务】把输入照片中的孩子变回TA三四岁婴幼儿时期的样子，做成白底大头贴。" +
        "成品必须是一张真实可爱小孩的照片：软糯、天真、有童真，绝不能像缩小的大人脸、绝不能又老又小。"
    );
    parts.push(
      "【身份】必须是同一个人，家人一眼认出：五官特征和神韵忠实于照片；" +
        "脸型忠实——瘦长脸就是清秀小瘦脸，绝不把脸画宽画圆，禁止大饼脸和双下巴；" +
        "气质忠实——帅气的就是帅气可爱，漂亮的就是漂亮可爱；" +
        "辨识度特征要比照片更明显：笑眼更弯、大耳朵更突出、酒窝更深、卷发更卷更可爱。"
    );
    parts.push(
      "【构图】纯白背景上一个剪出来的悬浮完整头部：端正朝前、居中偏小，头部和头顶饰品（墨镜、蝴蝶结等）全部完整在画面内，上方留出充足空白，" +
        "下巴边缘即内容结束——绝无脖子、肩膀、衣物；照片里的图标、按钮、文字、水印一律忽略不画。"
    );
    parts.push(`【人物】${f.basic.ethnicity}${f.basic.gender}。`);
  } else {
    parts.push(
      "【任务】一张可爱幼童的白底大头贴：完整头部居中，头部约占画面50%，四周留白，" +
        "无脖子肩膀身体，像剪出来的头部贴纸。"
    );
    parts.push(`【人物】${f.basic.ethnicity}${f.basic.gender}，${f.basic.age}。`);
  }

  let hair = `【发型·最重点】${f.hair.color}，${f.hair.length}，${f.hair.texture}，${f.hair.volume}，${f.hair.coverage}；${f.hair.fringe}。`;
  if (f.hair.accessories && f.hair.accessories !== "无") {
    hair += `戴着${f.hair.accessories}。`;
  }
  if (f.ears.visible) {
    hair += `耳朵露出${f.ears.note === "正常" ? "" : `（${f.ears.note}）`}。`;
  }
  hair +=
    "样式是TA小时候会有的自然儿童发型，整头质地一致连贯，发质细软有胎毛感；" +
    "卷直、蓬松、遮耳三项严格照此还原——卷发绝不画直，蓬松绝不梳服帖，照片盖住耳朵就不画耳朵。";
  parts.push(hair);

  parts.push(
    `【眼睛】${f.eyes.eyelid}，${f.eyes.size}，${f.eyes.color}，${f.eyes.shape_gaze}。` +
      "大小和形状严格还原，禁止放大或美化：单眼皮就画单眼皮，偏小就画偏小。"
  );

  if (fun.expr) {
    parts.push(
      `【表情·俏皮变体】${fun.expr}——保留本人神韵（${f.expression.personality}）。`
    );
  } else {
    parts.push(
      `【表情】${f.expression.type}，${f.expression.personality}。笑容幅度严格同照片：抿嘴就完全不露齿，露齿才露齿。`
    );
  }
  if (fun.gaze) {
    parts.push(`【眼神】${fun.gaze}。`);
  }

  let skin = `【肤色】${f.face_skin.skin_tone}，${f.face_skin.face_shape}`;
  if (f.face_skin.skin_detail && f.face_skin.skin_detail !== "无") {
    skin += `，${f.face_skin.skin_detail}`;
  }
  skin +=
    "。浅色和中等肤色明显提白：白透白皙、白里透粉、像牛奶一样通透发光；" +
    "深肤色（非裔、拉美裔等）保持本来基调只加健康光泽。";
  parts.push(skin);

  if (f.distinctive.length > 0) {
    parts.push(`【重点强调·比照片更明显】${f.distinctive.join("；")}。`);
  }

  if (fun.extras.length > 0) {
    parts.push(`【彩蛋】${fun.extras.join("；")}。只画这一件，不遮五官、不改发型长相。`);
  }
  parts.push(
    "【饰品纪律】除彩蛋和照片原有发饰外，不添加任何饰品——严禁鼻钉、项链、多余的眼镜或头饰。"
  );

  parts.push(
    "【质感】神态天真清澈，是小孩子的憨和真诚——绝不妩媚、不摆姿势；" +
      "无任何成人特征：嘴周和下巴光洁，无胡须、胡茬阴影，无皱纹、无喉结；露齿则牙齿洁白有光泽；" +
      "摄影级写实，柔和温暖的奶油光，发丝细软有绒毛感，头部边缘干净利落，纯白背景。"
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
  "五官要立体有神采，眼神明亮有灵气。神态必须天真清澈——是小孩子的憨和真诚，绝不能妩媚、撩人、成熟或做作，头部端正朝前自然直视。" +
  "气质跟随本人：帅气的就是帅气可爱的小孩。" +
  "发型：保留照片的发色和卷直质地，但样式换成这个人小时候会有的自然儿童发型，" +
  "整头发的质地必须一致连贯——绝不能头顶一种质地、两侧另一种质地。" +
  "嘴唇上方、嘴角四周和下巴彻底光洁：无胡子无胡茬无绒毛无阴影，肤色与脸颊一致；无皱纹、无喉结。" +
  "忽略照片中的一切非人物元素：截图的图标、按钮、文字、边框、水印统统不存在，绝不能出现在画面里。" +
  "无论照片里头部是歪斜、侧转还是被裁切，输出的头都必须端正朝前、完整居中，头顶发梢全部在画面内不被裁切。" +
  "纯白背景，画面里只有完整的头部，没有脖子、肩膀和衣物。摄影级写实，不加任何饰品。";

/** Conditional pass 3: surgical facial-hair removal, everything else untouched. */
export const FACE_CLEANUP_PROMPT =
  "只做一件事：把这个小孩嘴唇上方、嘴角四周和下巴的皮肤修得彻底光洁干净——" +
  "去掉所有胡须、胡茬、绒毛和任何青灰色阴影，让这些区域的肤色和脸颊完全一致、均匀、干净。" +
  "除此之外的一切保持原样完全不变：发型、五官、表情、眼神、饰品、构图、纯白背景全部不动。";

/** Repair pass when the generated head touches the canvas top edge. */
export const TOP_REPAIR_PROMPT =
  "画面边缘把头部或头顶的饰品裁切到了。把整幅内容明显缩小并完全居中，四周（尤其上方）留出充足的纯白空白，" +
  "补画出被裁切的部分——完整的头顶、头发轮廓和饰品。除此之外一切保持原样不变：脸、五官、表情、发型、肤色、纯白背景。";

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
