document.addEventListener('DOMContentLoaded', () => {
  // Navigation elements
  const btnPatientPortal = document.getElementById('btn-patient-portal');
  const btnDoctorPortal = document.getElementById('btn-doctor-portal');
  const patientSection = document.getElementById('patient-section');
  const doctorSection = document.getElementById('doctor-section');

  // Booking elements
  const bookingForm = document.getElementById('booking-form');

  // Search/Prescription elements
  const searchInput = document.getElementById('search-query');
  const btnSearch = document.getElementById('btn-search-booking');
  const searchResultContainer = document.getElementById('search-result-container');
  const prescriptionViewCard = document.getElementById('prescription-view-card');
  const rxPatientName = document.getElementById('rx-patient-name');
  const rxPatientId = document.getElementById('rx-patient-id');
  const rxContent = document.getElementById('rx-content');

  // Doctor Auth elements
  const doctorAuthCard = document.getElementById('doctor-auth-card');
  const doctorPasscode = document.getElementById('doctor-passcode');
  const btnAuthDoctor = document.getElementById('btn-auth-doctor');
  const authErrorMsg = document.getElementById('auth-error-msg');
  const doctorDashboardContent = document.getElementById('doctor-dashboard-content');
  const btnRefreshAppointments = document.getElementById('btn-refresh-appointments');
  const appointmentsListContainer = document.getElementById('appointments-list-container');

  // Chatbot elements
  const chatbotToggle = document.getElementById('chatbot-toggle');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotCloseBtn = document.getElementById('chatbot-close-btn');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotSendBtn = document.getElementById('chatbot-send-btn');

  // Toast notifications
  const toastContainer = document.getElementById('toast-container');

  // Global variables
  let isDoctorAuthed = false;
  let activeSearchQuery = "";
  let autoRefreshInterval = null;

  // -------------------------------------------------------------
  // Navigation Handlers
  // -------------------------------------------------------------
  btnPatientPortal.addEventListener('click', () => {
    btnPatientPortal.classList.add('active');
    btnDoctorPortal.classList.remove('active');
    patientSection.classList.add('active');
    doctorSection.classList.remove('active');
  });

  btnDoctorPortal.addEventListener('click', () => {
    btnDoctorPortal.classList.add('active');
    btnPatientPortal.classList.remove('active');
    doctorSection.classList.add('active');
    patientSection.classList.remove('active');
    
    if (isDoctorAuthed) {
      loadAppointments();
    }
  });

  // -------------------------------------------------------------
  // Toast Notification System
  // -------------------------------------------------------------
  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.innerHTML = `
      <i class="fa-solid ${isError ? 'fa-circle-xmark' : 'fa-circle-check'}"></i>
      <span>${message}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // -------------------------------------------------------------
  // Booking Form Submission
  // -------------------------------------------------------------
  bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('patient-name').value.trim();
    const age = document.getElementById('patient-age').value;
    const height = document.getElementById('patient-height').value;
    const weight = document.getElementById('patient-weight').value;
    const symptoms = document.getElementById('patient-symptoms').value.trim();

    try {
      const response = await fetch('/api/book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, age, height, weight, symptoms })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showToast(`تم حجز موعدك بنجاح! رقم الحجز الخاص بك هو ${data.appointment.id}`);
        bookingForm.reset();
        
        // Auto search the newly created booking
        searchInput.value = data.appointment.id;
        searchBooking(data.appointment.id);
      } else {
        showToast(data.error || "فشل في تسجيل الحجز.", true);
      }
    } catch (error) {
      console.error(error);
      showToast("حدث خطأ في الاتصال بالسيرفر.", true);
    }
  });

  // -------------------------------------------------------------
  // Booking Status & Prescription Search
  // -------------------------------------------------------------
  async function searchBooking(query) {
    if (!query) {
      searchResultContainer.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-info-circle"></i>
          <p>قم بالبحث أعلاه لعرض تفاصيل وصفتك الطبية.</p>
        </div>
      `;
      prescriptionViewCard.classList.add('hidden');
      return;
    }

    try {
      const response = await fetch('/api/appointments');
      const appointments = await response.json();
      
      const match = appointments.find(app => 
        app.id.toLowerCase() === query.toLowerCase().trim() || 
        app.name.toLowerCase().includes(query.toLowerCase().trim())
      );

      if (match) {
        searchResultContainer.innerHTML = '';
        prescriptionViewCard.classList.remove('hidden');
        
        rxPatientName.textContent = match.name;
        rxPatientId.textContent = match.id;
        
        if (match.prescription) {
          rxContent.textContent = match.prescription;
          rxContent.style.color = 'var(--neutral-dark)';
        } else {
          rxContent.textContent = "لم يقم الطبيب بكتابة الوصفة الطبية بعد. سيتم تحديث هذه الخانة فور إرسالها.";
          rxContent.style.color = '#7f8c8d';
        }
        activeSearchQuery = query;
      } else {
        searchResultContainer.innerHTML = `
          <div class="empty-state" style="border-color: var(--primary-pink); color: var(--dark-pink)">
            <i class="fa-solid fa-circle-exclamation"></i>
            <p>عذراً، لم نجد أي حجز مطابق لـ "${query}". يرجى التأكد من الاسم أو رقم الحجز.</p>
          </div>
        `;
        prescriptionViewCard.classList.add('hidden');
        activeSearchQuery = "";
      }
    } catch (error) {
      console.error(error);
      showToast("خطأ أثناء جلب البيانات.", true);
    }
  }

  btnSearch.addEventListener('click', () => {
    searchBooking(searchInput.value);
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchBooking(searchInput.value);
    }
  });

  // Polling for live prescription updates (if active patient is looking at a prescription)
  setInterval(() => {
    if (activeSearchQuery) {
      searchBooking(activeSearchQuery);
    }
  }, 4000);

  // -------------------------------------------------------------
  // Doctor Auth & Dashboard Logic
  // -------------------------------------------------------------
  btnAuthDoctor.addEventListener('click', () => {
    const code = doctorPasscode.value;
    if (code === '1234') {
      isDoctorAuthed = true;
      doctorAuthCard.classList.add('hidden');
      doctorDashboardContent.classList.remove('hidden');
      loadAppointments();
      showToast("تم تسجيل الدخول بنجاح.");
    } else {
      authErrorMsg.classList.remove('hidden');
      setTimeout(() => authErrorMsg.classList.add('hidden'), 3000);
    }
  });

  doctorPasscode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      btnAuthDoctor.click();
    }
  });

  btnRefreshAppointments.addEventListener('click', () => {
    if (isDoctorAuthed) {
      loadAppointments();
      showToast("تم تحديث الحجوزات.");
    }
  });

  async function loadAppointments() {
    try {
      const response = await fetch('/api/appointments');
      const appointments = await response.json();

      if (appointments.length === 0) {
        appointmentsListContainer.innerHTML = `
          <div class="no-appointments" style="grid-column: 1 / -1; text-align: center; padding: 40px;">
            <i class="fa-solid fa-calendar-xmark" style="font-size: 3rem; color: #bdc3c7; margin-bottom: 15px;"></i>
            <p style="color: #7f8c8d;">لا توجد حجوزات مسجلة حالياً.</p>
          </div>
        `;
        return;
      }

      appointmentsListContainer.innerHTML = '';
      appointments.forEach(app => {
        const hasPrescription = app.prescription && app.prescription.trim().length > 0;
        
        const card = document.createElement('div');
        card.className = 'appointment-card';
        card.innerHTML = `
          <div class="patient-profile">
            <div class="patient-name-id">
              <h4>${app.name}</h4>
              <span class="patient-id">رقم الحجز: ${app.id}</span>
            </div>
            <div class="prescription-status-indicator ${hasPrescription ? 'filled' : 'pending'}">
              <i class="fa-solid ${hasPrescription ? 'fa-check-circle' : 'fa-clock'}"></i>
              <span>${hasPrescription ? 'تمت الوصفة' : 'قيد الانتظار'}</span>
            </div>
          </div>
          <div class="patient-vitals">
            <span class="vitals-badge">العمر: ${app.age} سنة</span>
            <span class="vitals-badge">الطول: ${app.height} سم</span>
            <span class="vitals-badge">الوزن: ${app.weight} كغم</span>
          </div>
          <div class="patient-symptoms-box">
            <strong>الأعراض والشكوى:</strong>
            <p>${app.symptoms}</p>
          </div>
          <div class="doctor-action-box">
            <label for="prescription-${app.id}">العلاج والوصفة الطبية:</label>
            <textarea id="prescription-${app.id}" rows="3" placeholder="اكتب العلاج الموصوف، الأدوية، والجرعات...">${app.prescription || ''}</textarea>
            <button class="btn btn-secondary btn-send-prescription" data-id="${app.id}">
              <i class="fa-solid fa-file-signature"></i> إرسال الوصفة الطبية
            </button>
          </div>
        `;
        appointmentsListContainer.appendChild(card);
      });

      // Bind buttons
      document.querySelectorAll('.btn-send-prescription').forEach(button => {
        button.addEventListener('click', async (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          const prescriptionText = document.getElementById(`prescription-${id}`).value.trim();

          try {
            const res = await fetch('/api/prescribe', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ id, prescription: prescriptionText })
            });

            const resData = await res.json();
            if (res.ok && resData.success) {
              showToast(`تم إرسال وتحديث الوصفة الطبية للمريض ${resData.appointment.name} بنجاح.`);
              loadAppointments(); // reload list
            } else {
              showToast(resData.error || "خطأ أثناء تحديث الوصفة.", true);
            }
          } catch (err) {
            console.error(err);
            showToast("خطأ في الاتصال بالسيرفر.", true);
          }
        });
      });

    } catch (error) {
      console.error(error);
      showToast("خطأ في تحميل الحجوزات.", true);
    }
  }

  // -------------------------------------------------------------
  // Chatbot UI Toggle & Communication
  // -------------------------------------------------------------
  chatbotToggle.addEventListener('click', () => {
    chatbotWindow.classList.toggle('hidden');
    // Hide notifications badge
    const badge = chatbotToggle.querySelector('.badge');
    if (badge) badge.style.display = 'none';
  });

  chatbotCloseBtn.addEventListener('click', () => {
    chatbotWindow.classList.add('hidden');
  });

  async function handleChatbotSend() {
    const messageText = chatbotInput.value.trim();
    if (!messageText) return;

    // Append User message
    appendChatMessage(messageText, 'user');
    chatbotInput.value = '';

    // Typing loading bubble
    const loadingId = 'bot-loading-' + Date.now();
    const loadingMsg = document.createElement('div');
    loadingMsg.className = 'chat-message bot';
    loadingMsg.id = loadingId;
    loadingMsg.innerHTML = `
      <div class="message-bubble" style="opacity: 0.6">
        <i class="fa-solid fa-ellipsis animate-pulse"></i> يكتب الآن...
      </div>
    `;
    chatbotMessages.appendChild(loadingMsg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: messageText })
      });

      const data = await response.json();
      
      // Remove loading message
      document.getElementById(loadingId).remove();

      if (response.ok && data.reply) {
        appendChatMessage(data.reply, 'bot');
      } else {
        appendChatMessage("عذراً، أواجه مشكلة في معالجة طلبك حالياً.", 'bot');
      }
    } catch (err) {
      console.error(err);
      document.getElementById(loadingId).remove();
      appendChatMessage("عذراً، حدث خطأ في الاتصال بالسيرفر.", 'bot');
    }
  }

  function appendChatMessage(text, sender) {
    const msg = document.createElement('div');
    msg.className = `chat-message ${sender}`;
    msg.innerHTML = `
      <div class="message-bubble">
        ${text}
      </div>
    `;
    chatbotMessages.appendChild(msg);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  chatbotSendBtn.addEventListener('click', handleChatbotSend);
  chatbotInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleChatbotSend();
    }
  });

});
