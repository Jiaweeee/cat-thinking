import { createRouter } from "next-connect";
import multer from 'multer';
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = 'gemini-pro-vision';

const upload = multer({
  storage: multer.memoryStorage(),
});

const router = createRouter();

router.use(upload.single('image'));

router.all((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
  } else {
    next();
  }
});

router.post(async (req, res) => {
  console.log('req.file:', req.file); // 添加日志
  try {
    console.log('Starting request...');
    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
      temperature: 1,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    };

    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    if (!req.file) {
      console.log('No file uploaded.'); // 添加日志
      res.status(400).json({ error: 'No file uploaded.' });
      return;
    }

    const cat_thinking_prompt = `You are a skilled cat language translator, 
    able to translate the cat\'s voice through the user\'s uploaded cat pictures. 
    Accurately guess the cat\'s emotions and thoughts through the content of the user\'s uploaded cat pictures. 
    You can guess what the cat wants to say based on the cat\'s body language, expressions, and surrounding environment. 
    After interpreting, please give the cat\'s "voice" according to the cat\'s tone, 
    a bit more natural spoken language, answer in English, the format is as follows: 🐱: [<What the cat thinks>]. 
    In the user\'s uploaded picture, if there is no cat, then return "There is no cat in the picture~"`;

    const phone_photo_prompt = `As an enthusiast skilled in mobile photography, 
    especially in taking beautiful photos of girlfriends, 
    you will critique photos taken by users with their smartphones. 
    The critique should focus on the following aspects: 
    1. How to use the characteristics and limitations of mobile photography to create aesthetic shots. 
    2. Composition techniques for photographing women, including choosing angles, lighting, and backgrounds. 
    3. How to improve photo quality using smartphone settings like exposure, focus, and color balance. 
    4. Provide specific operational steps and tips to help photographers improve their skills. 
    The aim is to offer practical advice and steps to help photographers capture more beautiful moments and enhance their mobile photography skills.`;

    const parts = [
      {
        text: cat_thinking_prompt,
      },
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: req.file.buffer.toString('base64'),
        },
      },
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig,
      safetySettings,
    });

    if (!result) {
      console.log('No result from generateContent.'); // 添加日志
    } else {
      console.log('Result from generateContent:', result); // 添加日志
    }

    const responseText = result.response.text();
    res.status(200).json({ result: responseText });
  } catch (error) {
    console.error('Error during request:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  } finally {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unknown error' });
    }
  }
});

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

export default router.handler();