const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-Memory Database for demonstration
let appointments = [
  {
    id: "B-1001",
    name: "أحمد عبد الله",
    age: 45,
    height: 175,
    weight: 80,
    symptoms: "أشعر بضيق في التنفس عند بذل مجهود بسيط مع ألم خفيف في الصدر.",
    prescription: "يرجى إجراء تخطيط صلب وإجراء فحص جهد. تجنب المجهود البدني الشديد حالياً.",
    date: "2026-06-30T08:00:00.000Z"
  },
  {
    id: "B-1002",
    name: "سارة محمد",
    age: 32,
    height: 160,
    weight: 62,
    symptoms: "خفقان سريع في القلب يأتي فجأة ويستمر لبضع دقائق خاصة عند التوتر.",
    prescription: "",
    date: "2026-06-30T08:30:00.000Z"
  }
];

// Helper to generate IDs
let bookingCounter = 1003;
function generateId() {
  return `B-${bookingCounter++}`;
}

// 1. POST /api/book - Create a booking
app.post('/api/book', (req, res) => {
  const { name, age, height, weight, symptoms } = req.body;

  if (!name || !age || !height || !weight || !symptoms) {
    return res.status(400).json({ error: "جميع الحقول مطلوبة لإتمام الحجز" });
  }

  const newAppointment = {
    id: generateId(),
    name,
    age: parseInt(age),
    height: parseInt(height),
    weight: parseInt(weight),
    symptoms,
    prescription: "",
    date: new Date().toISOString()
  };

  appointments.push(newAppointment);
  res.status(201).json({ success: true, appointment: newAppointment });
});

// 2. GET /api/appointments - Retrieve all appointments (for Doctor Dashboard)
app.get('/api/appointments', (req, res) => {
  // Sort by date descending
  const sorted = [...appointments].sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(sorted);
});

// 3. POST /api/prescribe - Update appointment with prescription
app.post('/api/prescribe', (req, res) => {
  const { id, prescription } = req.body;

  if (!id) {
    return res.status(400).json({ error: "معرف الحجز مطلوب" });
  }

  const appointment = appointments.find(app => app.id === id);
  if (!appointment) {
    return res.status(404).json({ error: "لم يتم العثور على الحجز المطلوب" });
  }

  appointment.prescription = prescription || "";
  res.json({ success: true, appointment });
});

// 4. POST /api/chatbot - Basic chatbot responses
app.post('/api/chatbot', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  const msg = message.toLowerCase().trim();
  let reply = "";

  if (msg.includes("موعد") || msg.includes("مواعيد") || msg.includes("حجز") || msg.includes("اوقات")) {
    reply = "أهلاً بك! تفتح العيادة أبوابها يومياً من السبت إلى الخميس من الساعة 9:00 صباحاً وحتى 8:00 مساءً. يمكنك حجز موعدك مباشرة عبر نموذج الحجز في الصفحة الرئيسية.";
  } else if (msg.includes("سعر") || msg.includes("كشف") || msg.includes("تكلفة") || msg.includes("قيمة")) {
    reply = "سعر الكشفية الطبية الشاملة (مع تخطيط القلب الأساسي) هو 250 ريالاً. تشمل الاستشارة والمتابعة خلال أسبوع.";
  } else if (msg.includes("طوارئ") || msg.includes("عاجل") || msg.includes("ألم") || msg.includes("اسعاف") || msg.includes("اموت")) {
    reply = "تنبيه هام: إذا كنت تعاني من ألم شديد ومفاجئ في الصدر ينتشر للكتف أو الفك، أو ضيق حاد في التنفس، يرجى الاتصال بالإسعاف فوراً (997) أو التوجه لأقرب مستشفى. صحتك هي الأهم!";
  } else if (msg.includes("عنوان") || msg.includes("موقع") || msg.includes("مكان") || msg.includes("فين")) {
    reply = "تقع عيادتنا في 'شارع الصحة، برج النخبة الطبي، الطابق الثالث، الرياض'. يمكنك استخدام مواقف البرج المخصصة للمرضى.";
  } else if (msg.includes("طبيب") || msg.includes("دكتور") || msg.includes("من هو")) {
    reply = "يشرف على العيادة الدكتور استشاري أمراض وزراعة القلب وقسطرة الشرايين، بخبرة تفوق 15 عاماً في المستشفات الجامعية والتخصصية.";
  } else {
    reply = "مرحباً بك في مركز رعاية القلب. لم أفهم استفسارك تماماً، ولكن يمكنك الاستفسار عن: (مواعيد العمل، سعر الكشف، موقع العيادة، الحالات الطارئة، أو معلومات عن الطبيب). كيف يمكنني مساعدتك اليوم؟";
  }

  res.json({ reply });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
