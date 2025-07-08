document.addEventListener('DOMContentLoaded', () => {
    console.log('Script.js carregado com sucesso!');

    // --- CONFIGURAÇÃO DO FIREBASE ---
    // COLE AQUI O SEU OBJETO firebaseConfig QUE VOCÊ COPIOU DO CONSOLE DO FIREBASE
    // **ISTO É OBRIGATÓRIO! SUBSTITUA OS VALORES DE EXEMPLO PELOS SEUS REAIS**
    const firebaseConfig = {
      apiKey: "AIzaSyCxX4Xb1kYdUkzYcQ8h64NzA_E", // SEU VALOR REAL
      authDomain: "guiapescaesportiva.firebaseapp.com", // SEU VALOR REAL
      projectId: "guiapescaesportiva", // SEU VALOR REAL
      storageBucket: "guiapescaesportiva.appspot.com", // SEU VALOR REAL
      messagingSenderId: "101970291973", // SEU VALOR REAL
      appId: "1:101970291973:web:359B8B65Eb95799321edbc" // SEU VALOR REAL
    };

    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    // Obtém uma referência para o serviço Firestore
    const db = firebase.firestore();

    // --- Definição dos Preços dos Pacotes (Ajuste aqui se os preços mudarem) ---
    const PACKAGE_PRICES = {
        'dupla': 800, // R$ 800 por diária para dupla (2 pessoas)
        'trio': 900   // R$ 900 por diária para trio (3 pessoas)
    };
    const SIGNAL_PERCENTAGE = 0.30; // 30% de sinal

    // --- Lógica para Filtro da Galeria ---
    const filterButtons = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const filter = button.dataset.filter;
            galleryItems.forEach(item => {
                if (filter === 'all' || item.dataset.category === filter) {
                    item.classList.remove('hidden');
                } else {
                    item.classList.add('hidden');
                }
            });
        });
    });

    // --- Lógica para Lightbox Simples (Overlay de Imagem) ---
    const lightbox = document.createElement('div');
    lightbox.id = 'lightbox';
    document.body.appendChild(lightbox);

    galleryItems.forEach(item => {
        item.addEventListener('click', () => {
            const imgSrc = item.querySelector('img').src;
            const imgAlt = item.querySelector('img').alt;
            const overlayTitle = item.querySelector('.item-overlay h4').textContent;
            const overlayDesc = item.querySelector('.item-overlay p').textContent;

            lightbox.classList.add('active');
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <span class="close-btn">&times;</span>
                    <img src="${imgSrc}" alt="${imgAlt}">
                    <div class="lightbox-info">
                        <h4>${overlayTitle}</h4>
                        <p>${overlayDesc}</p>
                    </div>
                </div>
            `;
            lightbox.querySelector('.close-btn').addEventListener('click', () => {
                lightbox.classList.remove('active');
            });
            lightbox.addEventListener('click', (e) => {
                if (e.target.id === 'lightbox') {
                    lightbox.classList.remove('active');
                }
            });
        });
    });


    // --- Lógica para o Calendário de Agendamento (FullCalendar) ---
    const calendarEl = document.getElementById('calendar');
    const bookingDateInput = document.getElementById('bookingDate');
    const bookingForm = document.getElementById('bookingForm');
    const bookingFormMessage = document.getElementById('formMessage');

    let bookedDates = []; // As datas ocupadas virão do Firestore
    let selectedDates = []; 
    let calendarInstance;

    async function loadAndRenderCalendar() {
        if (!calendarEl) return;

        try {
            // BUSCA AS DATAS OCUPADAS DO FIRESTORE
            const bookingsRef = db.collection('bookings'); // Nome da coleção no Firestore
            // Filtra por status Pendente, Confirmado ou Sinal Pago para marcar como ocupado
            const snapshot = await bookingsRef.where('status', 'in', ['Pendente', 'Confirmado', 'Sinal Pago']).get();
            
            const fetchedBookedDates = [];
            snapshot.forEach(doc => {
                const booking = doc.data();
                if (booking.dates) {
                    // Se 'dates' for uma string de datas separadas por vírgula, divida-a
                    booking.dates.split(',').forEach(dateStr => {
                        const trimmedDate = dateStr.trim();
                        if (trimmedDate) {
                            fetchedBookedDates.push(trimmedDate);
                        }
                    });
                }
            });
            bookedDates = fetchedBookedDates;

        } catch (error) {
            console.error('Erro ao carregar datas do Firestore:', error);
            displayFormMessage(bookingFormMessage, 'Erro ao carregar disponibilidade. Tente novamente mais tarde.', 'error');
        }

        if (calendarInstance) {
            calendarInstance.destroy(); // Destrói a instância anterior para recriar
        }

        calendarInstance = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'pt-br',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: ''
            },
            dayCellDidMount: function(info) {
                const dateStr = info.date.toISOString().split('T')[0];
                const today = new Date();
                today.setHours(0,0,0,0);
                const cellDate = new Date(info.date);
                cellDate.setHours(0,0,0,0);

                if (cellDate < today) {
                     info.el.classList.add('fc-day-past');
                     info.el.classList.add('fc-day-booked');
                }

                if (bookedDates.includes(dateStr)) {
                    info.el.classList.add('fc-day-booked');
                }

                if (selectedDates.includes(dateStr)) {
                    info.el.classList.add('fc-day-selected');
                }
            },
            dateClick: function(info) {
                const clickedDateStr = info.date.toISOString().split('T')[0];
                const today = new Date();
                today.setHours(0,0,0,0);
                const clickedDate = new Date(info.date);
                clickedDate.setHours(0,0,0,0);

                if (bookedDates.includes(clickedDateStr) || clickedDate < today) {
                    alert('Este dia não está disponível para agendamento. Por favor, escolha outra data.');
                    return;
                }

                const index = selectedDates.indexOf(clickedDateStr);
                if (index > -1) {
                    selectedDates.splice(index, 1);
                    info.dayEl.classList.remove('fc-day-selected');
                } else {
                    selectedDates.push(clickedDateStr);
                    info.dayEl.classList.add('fc-day-selected');
                }

                bookingDateInput.value = selectedDates.sort().join(', ');
                displayFormMessage(bookingFormMessage, '', 'hidden');
            }
        });
        calendarInstance.render();
    }

    loadAndRenderCalendar();


    // --- Lógica para o Formulário de Reserva (Agendamento) ---
    if (bookingForm) {
        bookingForm.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            displayFormMessage(bookingFormMessage, '', 'hidden');

            if (selectedDates.length === 0) {
                displayFormMessage(bookingFormMessage, 'Por favor, selecione pelo menos uma data no calendário.', 'error');
                return;
            }

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const numAnglers = parseInt(document.getElementById('numAnglers').value); // Converte para número
            const fishingTypeSelect = document.getElementById('fishingType');
            const fishingType = fishingTypeSelect.value; // Valor do pacote selecionado (dupla, trio)
            const fishingTypeText = fishingTypeSelect.options[fishingTypeSelect.selectedIndex].text; // Texto do pacote
            const message = document.getElementById('message').value.trim();

            if (fullName === '' || email === '' || phone === '' || !fishingType || numAnglers < 1) { // Validação do tipo de pescaria e número de pescadores
                displayFormMessage(bookingFormMessage, 'Por favor, preencha todos os campos obrigatórios e válidos.', 'error');
                return;
            }

            // Validação do número de pescadores com base no tipo de pescaria
            if ( (fishingType === 'dupla' && numAnglers !== 2) || (fishingType === 'trio' && numAnglers !== 3) ) {
                displayFormMessage(bookingFormMessage, `Para o pacote ${fishingTypeText}, o número de pescadores deve ser ${fishingType === 'dupla' ? '2' : '3'}.`, 'error');
                return;
            }

            if (!isValidEmail(email)) {
                displayFormMessage(bookingFormMessage, 'Por favor, insira um endereço de e-mail válido.', 'error');
                return;
            }

            // --- LÓGICA DE CÁLCULO DE PREÇO E SINAL ---
            if (!PACKAGE_PRICES[fishingType]) {
                displayFormMessage(bookingFormMessage, 'Tipo de pescaria selecionado inválido para cálculo de preço.', 'error');
                return;
            }

            const dailyPrice = PACKAGE_PRICES[fishingType];
            const numberOfDays = selectedDates.length;
            const totalPrice = dailyPrice * numberOfDays;
            const signalValue = totalPrice * SIGNAL_PERCENTAGE;
            // Formatando para 2 casas decimais para exibição e email
            const formattedTotalPrice = totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formattedSignalValue = signalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            // Prepara os dados para salvar no Firestore
            const bookingData = {
                fullName: fullName,
                email: email,
                phone: phone,
                numAnglers: numAnglers,
                fishingType: fishingType, // Salva o valor ('dupla', 'trio')
                fishingTypeText: fishingTypeText, // Salva o texto completo para o resumo
                message: message,
                dates: selectedDates.sort().join(','), 
                totalPrice: totalPrice, // Salva o preço total (numérico)
                signalValue: signalValue, // Salva o valor do sinal (numérico)
                status: 'Pendente', // Status inicial. O cliente pagará o sinal.
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Data/hora do servidor
            };

            // Preenche o campo hidden _replyto para o Formspree
            const bookingReplyToEmailField = document.getElementById('bookingReplyToEmail');
            if (bookingReplyToEmailField) {
                bookingReplyToEmailField.value = email;
            }

            try {
                // SALVA A RESERVA NO FIRESTORE
                const docRef = await db.collection('bookings').add(bookingData);
                const bookingId = docRef.id; // Pega o ID do documento criado no Firestore

                // Envia a notificação para o Formspree (APÓS SALVAR NO FIRESTORE)
                const formspreeEndpoint = bookingForm.action;
                const formspreeFormData = new FormData(bookingForm);
                // Adiciona todos os dados importantes para o e-mail do Formspree
                formspreeFormData.set('bookingDate', bookingDateInput.value); 
                formspreeFormData.set('dates', selectedDates.sort().join(', '));
                formspreeFormData.set('status', 'Pendente');
                formspreeFormData.set('totalPrice', formattedTotalPrice); // Preço formatado para o e-mail
                formspreeFormData.set('signalValue', formattedSignalValue); // Sinal formatado para o e-mail
                formspreeFormData.set('bookingId', bookingId); // Adiciona o ID da reserva para rastreamento

                await fetch(formspreeEndpoint, {
                    method: 'POST',
                    body: formspreeFormData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                // REDIRECIONA PARA A PÁGINA DE CHECKOUT com os detalhes na URL
                const checkoutParams = new URLSearchParams({
                    id: bookingId, // ID da reserva no Firebase
                    fullName: fullName,
                    email: email,
                    phone: phone,
                    dates: selectedDates.sort().join(','),
                    fishingType: fishingTypeText, // Envia o texto do tipo de pacote
                    numAnglers: numAnglers,
                    message: message,
                    totalPrice: totalPrice, // Valor numérico
                    signalValue: signalValue // Valor numérico
                }).toString();

                window.location.href = `checkout.html?${checkoutParams}`;

            } catch (error) {
                console.error('Erro geral no envio da reserva (Firebase/Formspree/Redirecionamento):', error);
                displayFormMessage(bookingFormMessage, 'Houve um problema ao processar sua reserva. Por favor, tente novamente mais tarde.', 'error');
            }
        });
    }


    // --- Lógica para a Página de Checkout (checkout.html) ---
    // Executa apenas se a página atual for checkout.html
    if (window.location.pathname.includes('checkout.html')) {
        const summaryFullName = document.getElementById('summaryFullName');
        const summaryEmail = document.getElementById('summaryEmail');
        const summaryPhone = document.getElementById('summaryPhone');
        const summaryDates = document.getElementById('summaryDates');
        const summaryFishingType = document.getElementById('summaryFishingType');
        const summaryNumAnglers = document.getElementById('summaryNumAnglers');
        const summaryMessage = document.getElementById('summaryMessage');
        const summaryTotalPrice = document.getElementById('summaryTotalPrice');
        // Elemento para exibir o valor do sinal
        const summarySignalValue = document.getElementById('summarySignalValue'); 
        const pixKeyToCopy = document.getElementById('pixKeyToCopy');
        const btnCopyPix = document.querySelector('.btn-copy-pix');
        const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
        const checkoutMessage = document.getElementById('checkoutMessage'); // Mensagem para a página de checkout

        const urlParams = new URLSearchParams(window.location.search);

        const bookingId = urlParams.get('id'); 
        const fullName = urlParams.get('fullName');
        const email = urlParams.get('email');
        const phone = urlParams.get('phone');
        const dates = urlParams.get('dates');
        const fishingType = urlParams.get('fishingType');
        const numAnglers = urlParams.get('numAnglers');
        const message = urlParams.get('message');
        // Usamos parseFloat pois os valores vêm como string da URL
        const totalPrice = parseFloat(urlParams.get('totalPrice'));
        const signalValue = parseFloat(urlParams.get('signalValue'));

        // Preenche o resumo na página de checkout
        if (summaryFullName) summaryFullName.textContent = fullName || 'N/A';
        if (summaryEmail) summaryEmail.textContent = email || 'N/A';
        if (summaryPhone) summaryPhone.textContent = phone || 'N/A';
        if (summaryDates) summaryDates.textContent = dates ? dates.split(',').join(', ') : 'N/A';
        if (summaryFishingType) summaryFishingType.textContent = fishingType || 'N/A';
        if (summaryNumAnglers) summaryNumAnglers.textContent = numAnglers || 'N/A';
        if (summaryMessage) summaryMessage.textContent = message || 'N/A';
        
        // Formata os valores monetários para exibição
        if (summaryTotalPrice) summaryTotalPrice.textContent = totalPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        if (summarySignalValue) summarySignalValue.textContent = signalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); // Exibe o valor do sinal

        // Lógica do botão copiar Chave Pix
        if (btnCopyPix && pixKeyToCopy) {
            btnCopyPix.addEventListener('click', () => {
                navigator.clipboard.writeText(pixKeyToCopy.textContent).then(() => {
                    displayFormMessage(checkoutMessage, 'Chave Pix copiada para a área de transferência!', 'success');
                }).catch(err => {
                    console.error('Erro ao copiar Pix:', err);
                    displayFormMessage(checkoutMessage, 'Não foi possível copiar a chave Pix. Por favor, copie manualmente.', 'error');
                });
            });
        }

        // Lógica do botão "Já Realizei o Pagamento e Quero Confirmar!"
        if (confirmPaymentBtn) {
            confirmPaymentBtn.addEventListener('click', async () => {
                displayFormMessage(checkoutMessage, '', 'hidden');
                if (!bookingId) {
                    displayFormMessage(checkoutMessage, 'Erro: ID da reserva não encontrado para confirmação. Volte e tente novamente.', 'error');
                    return;
                }

                try {
                    // ATUALIZA O STATUS DA RESERVA NO FIRESTORE PARA 'Sinal Pago'
                    const bookingDocRef = db.collection('bookings').doc(bookingId);
                    await bookingDocRef.update({
                        status: 'Sinal Pago', // Muda o status da reserva no Firestore
                        paymentConfirmationTimestamp: firebase.firestore.FieldValue.serverTimestamp() // Registra a data da confirmação
                    });
                    
                    displayFormMessage(checkoutMessage, 'Sua confirmação de pagamento foi registrada! Seu guia será notificado. Obrigado!', 'success');
                    confirmPaymentBtn.disabled = true; // Desabilita o botão para evitar múltiplos cliques
                    // Opcional: Você pode mudar a cor do botão ou texto para indicar que já foi clicado.

                    // NOTA: Para notificar o guia por e-mail sobre o sinal pago, você precisaria de um Cloud Function do Firebase
                    // que seria acionada pela mudança no status do documento no Firestore. Isso é mais complexo e pode ter custos.
                    // Por enquanto, você verificará o status manualmente no Console do Firebase.

                } catch (error) {
                    console.error('Erro ao confirmar pagamento no Firestore:', error);
                    displayFormMessage(checkoutMessage, 'Erro ao registrar confirmação de pagamento. Por favor, entre em contato com o guia.', 'error');
                }
            });
        }
    }


    // --- Lógica para o Formulário de Contato ---
    const contactForm = document.getElementById('contactForm');
    const contactFormMessage = document.getElementById('contactFormMessage'); 

    if (contactForm) {
        contactForm.addEventListener('submit', async function(event) {
            event.preventDefault();

            displayFormMessage(contactFormMessage, '', 'hidden');

            const contactName = document.getElementById('contactName').value.trim();
            const contactEmail = document.getElementById('contactEmail').value.trim();
            const contactSubject = document.getElementById('contactSubject').trim(); 
            const contactMessage = document.getElementById('contactMessage').value.trim();

            if (contactName === '' || contactEmail === '' || contactSubject === '' || contactMessage === '') {
                displayFormMessage(contactFormMessage, 'Por favor, preencha todos os campos obrigatórios.', 'error');
                return;
            }

            if (!isValidEmail(contactEmail)) {
                displayFormMessage(contactFormMessage, 'Por favor, insira um endereço de e-mail válido.', 'error');
                return;
            }

            const contactReplyToEmailField = document.getElementById('contactReplyToEmail');
            if (contactReplyToEmailField) {
                contactReplyToEmailField.value = contactEmail;
            }

            const contactData = {
                name: contactName,
                email: contactEmail,
                subject: contactSubject,
                message: contactMessage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp() // Data/hora do servidor
            };

            try {
                // SALVA A MENSAGEM DE CONTATO NO FIRESTORE
                await db.collection('contacts').add(contactData); // Nova coleção 'contacts'

                // Envia a notificação para o Formspree (SEMPRE POR ÚLTIMO)
                const formspreeEndpoint = contactForm.action;
                const formspreeFormData = new FormData(contactForm); 

                await fetch(formspreeEndpoint, {
                    method: 'POST',
                    body: formspreeFormData,
                    headers: {
                        'Accept': 'application/json'
                    }
                });

                displayFormMessage(contactFormMessage, 'Sua mensagem foi enviada com sucesso! Entraremos em contato em breve.', 'success');
                contactForm.reset(); 
            } catch (error) {
                console.error('Erro geral no envio do contato (Firebase/Formspree):', error);
                displayFormMessage(contactFormMessage, 'Houve um problema ao enviar sua mensagem. Por favor, tente novamente mais tarde.', 'error');
            }
        });
    }


    // --- Funções Auxiliares Comuns ---

    function isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function displayFormMessage(element, message, type) {
        element.textContent = message;
        element.className = `form-message ${type}`; 
        if (type === 'hidden') {
            element.style.display = 'none'; 
        } else {
            element.style.display = 'block'; 
        }
    }
});