// js/ui.js

let notyf;

export function initToast() {
    if (window.Notyf) {
        notyf = new Notyf({
            duration: 4000, position: { x: 'right', y: 'top' },
            types: [
                { type: 'success', backgroundColor: '#28a745', icon: { className: 'fas fa-check-circle', tagName: 'i' } },
                { type: 'error', backgroundColor: '#dc3545', icon: { className: 'fas fa-times-circle', tagName: 'i' } },
                { type: 'info', backgroundColor: '#17a2b8', icon: { className: 'fas fa-info-circle', tagName: 'i' } }
            ]
        });
    }
}

export function showToast(message, type = 'success') {
    if (notyf) notyf.open({ type, message });
    else alert(message);
}

function getOptimizedCloudinaryUrl(url, transformations = 'w_400,h_400,c_fill,q_auto') {
    if (!url || !url.includes('res.cloudinary.com')) return url || `https://placehold.co/400x300/EEE/31343C?text=Presente`;
    return url.replace('/image/upload/', `/image/upload/${transformations},f_auto/`);
}

export function setButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
        button.disabled = true;
        if (!button.dataset.originalText) button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<div class="btn-spinner mx-auto"></div>`;
    } else {
        button.disabled = false;
        if (button.dataset.originalText) button.innerHTML = button.dataset.originalText;
    }
}

function renderCarousel(photos) {
    if (!photos || photos.length === 0) return '';

    const slides = photos.map(photo => `
        <div class="carousel-slide">
            <img src="${getOptimizedCloudinaryUrl(photo, 'w_800,h_600,c_fill,q_auto')}" class="w-full h-full object-cover" alt="Foto do casal">
        </div>
    `).join('');

    const dots = photos.map((_, index) => `<div class="carousel-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></div>`).join('');

    return `
        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-2 mb-8">
            <div id="carousel-container" class="carousel-container rounded-lg aspect-[4/3] relative">
                <div id="carousel-track" class="carousel-track h-full">
                    ${slides}
                </div>
                ${photos.length > 1 ? `
                    <button class="carousel-button prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carousel-button next"><i class="fas fa-chevron-right"></i></button>
                    <div class="carousel-dots">${dots}</div>
                ` : ''}
            </div>
        </div>
    `;
}


function renderAboutSection(weddingDetails) {
    const aboutConfig = weddingDetails.aboutUs || { mode: 'timeline' };

    if (aboutConfig.mode === 'text') {
        const textData = aboutConfig.text || {};
        const imageHTML = textData.imageUrl
            ? `<img src="${getOptimizedCloudinaryUrl(textData.imageUrl, 'w_800,c_fill,q_auto')}" 
                    class="w-full h-64 md:h-96 object-cover rounded-xl shadow-lg mb-6" 
                    alt="${textData.title}">`
            : '';

        return `
            <div class="space-y-6">
                <div class="text-center">
                    <h1 class="text-4xl font-cursive text-primary dark:text-dark-primary mb-2">
                        ${textData.title || 'Nossa História'}
                    </h1>
                </div>
                ${imageHTML}
                <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 md:p-8">
                    <div class="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        ${textData.content || 'Conte aqui a história do casal...'}
                    </div>
                </div>
            </div>
        `;
    } else {
        // Mode: timeline - Usar a função existente renderTimeline
        return `
            <div class="space-y-6">
                <div class="text-center">
                    <h1 class="text-4xl font-cursive text-primary dark:text-dark-primary mb-2">Nossa Jornada</h1>
                    <p class="text-gray-600 dark:text-gray-400">Os momentos especiais que nos trouxeram até aqui</p>
                </div>
                <div id="timeline-container"></div>
            </div>
        `;
    }
}

export function generateViewHTML(viewName, user, weddingDetails, accessKeyInfo) {
    if (!weddingDetails) return `<div class="text-center p-8"><div class="animate-pulse"><div class="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div><div class="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div></div></div>`;

    const formatDate = (date) => date ? date.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Data não disponível';
    const formatTime = (date) => date ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Horário não disponível';

    const specialRoles = ["Padrinho", "Madrinha", "Amigo do Noivo", "Amiga da Noiva"];

    switch (viewName) {
        case 'home':
            const bgConfig = weddingDetails.homeBackground || { enabled: false };
            let bgStyle = '';
            let bgHTML = '';

            if (bgConfig.enabled && bgConfig.imageUrl) {
                const orientation = bgConfig.orientation || 'horizontal';
                const opacity = bgConfig.opacity || 0.3;

                bgHTML = `
            <div class="fixed inset-0 z-0 overflow-hidden">
                <img src="${bgConfig.imageUrl}" 
                    class="w-full h-full ${orientation === 'vertical' ? 'object-cover' : 'object-cover'}" 
                    style="object-position: center;" 
                    alt="Background">
                <div class="absolute inset-0 bg-black" style="opacity: ${opacity};"></div>
            </div>
        `;
            }

            return `
        ${bgHTML}
        <div class="relative z-10 space-y-8 text-center">
            ${renderCarousel(weddingDetails.carouselPhotos)}
            <div class="bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-sm rounded-xl shadow-md p-8">
                <h1 class="text-5xl font-cursive text-primary dark:text-dark-primary mb-4">
                    ${weddingDetails.coupleNames}
                </h1>
                <p class="text-gray-600 dark:text-gray-400">
                    Temos a honra de convidar para a celebração do nosso amor!
                </p>
            </div>
            <div class="bg-light-card/95 dark:bg-dark-card/95 backdrop-blur-sm rounded-xl shadow-md p-6">
                <h2 class="text-xl font-medium mb-4">Contagem Regressiva</h2>
                <div id="countdown" class="flex justify-center space-x-2 md:space-x-4"></div>
            </div>
        </div>
    `;
        case 'about':
            return renderAboutSection(weddingDetails);
        case 'details':
            const venuePhotoHTML = weddingDetails.venuePhoto
                ? `<img src="${getOptimizedCloudinaryUrl(weddingDetails.venuePhoto, 'w_800,c_fill,q_auto')}" alt="Local da Cerimônia" class="w-full h-auto rounded-lg mb-6 shadow-md">`
                : '';

            return `<div class="space-y-6">
                <div class="text-center"><h1 class="text-3xl font-cursive mb-2">Detalhes do Evento</h1></div>
                ${venuePhotoHTML}
                <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4">
                    <h3 class="text-lg font-semibold border-b pb-2 mb-3">Cerimônia</h3>
                    <div class="flex items-center"><i class="fas fa-calendar-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${formatDate(weddingDetails.weddingDate)}</span></div>
                    <div class="flex items-center"><i class="fas fa-clock fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${formatTime(weddingDetails.weddingDate)}h</span></div>
                    <div class="flex items-center"><i class="fas fa-map-marker-alt fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.venue}</span></div>
                    <div class="flex items-center"><i class="fas fa-user-tie fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>Traje: ${weddingDetails.dressCode}</span></div>
                </div>
                ${weddingDetails.restaurantName ? `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6 space-y-4"><h3 class="text-lg font-semibold border-b pb-2 mb-3">Comemoração Pós-Cerimônia</h3><div class="flex items-center"><i class="fas fa-utensils fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantName}</span></div><div class="flex items-center"><i class="fas fa-map-pin fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantAddress}</span></div><div class="flex items-center"><i class="fas fa-dollar-sign fa-fw mr-3 text-primary dark:text-dark-primary"></i><span>${weddingDetails.restaurantPriceInfo}</span></div>${weddingDetails.restaurantMapsLink ? `<a href="${weddingDetails.restaurantMapsLink}" target="_blank" class="block w-full text-center mt-4 py-2 px-4 bg-primary text-white font-medium rounded-lg">Ver no Google Maps</a>` : ''}</div>` : ''}
            </div>`;

        case 'guest-photos':
            return `<div class="space-y-6"><div class="text-center"><h1 class="text-3xl font-cursive mb-2">Galeria dos Convidados</h1></div>${user ? `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6"><p class="text-center mb-4">Olá, ${user.displayName}! Compartilhe seus registros.</p><div class="flex flex-col sm:flex-row items-center gap-4"><input type="file" id="photo-input" accept="image/*" class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 dark:file:bg-dark-primary/20 dark:file:text-dark-primary"/><button id="upload-button" class="bg-primary text-white px-4 py-2 rounded-lg w-full sm:w-auto flex-shrink-0"><i class="fas fa-upload mr-2"></i>Enviar</button></div><div id="upload-progress-container" class="mt-4 hidden"><div class="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700"><div id="progress-bar" class="bg-primary h-2.5 rounded-full" style="width: 0%"></div></div></div></div><div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6"><h2 class="text-xl font-medium mb-4 flex items-center"><i class="fas fa-camera-retro text-primary dark:text-dark-primary mr-2"></i>Caça ao Tesouro Fotográfica!</h2><ul class="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300"><li>Uma foto com alguém que você acabou de conhecer</li><li>Uma foto do seu detalhe favorito da decoração</li><li>Uma selfie com os noivos</li><li>A foto mais divertida do casamento!</li></ul></div>` : `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 text-center"><i class="fas fa-lock text-3xl text-gray-400 mb-4"></i><h2 class="text-xl font-medium mb-2">Galeria Exclusiva</h2><p class="text-gray-600 dark:text-gray-400">Para ver e enviar fotos, por favor, faça o login na aba "Acesso".</p></div>`}<div id="photo-gallery" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"></div></div>`;

        case 'guestbook':
            return `<div class="space-y-6"><div class="text-center"><h1 class="text-3xl font-cursive mb-2">Mural de Recados</h1></div><div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6">${user ? `<h2 class="text-xl font-medium mb-4">Deixe sua mensagem de carinho</h2><form id="guestbook-form" class="space-y-4"><textarea id="guestbook-message" class="w-full p-2 border rounded dark:bg-gray-800 dark:border-gray-600" rows="4" placeholder="Escreva sua mensagem aqui..." required></textarea><button type="submit" class="w-full py-2 bg-primary text-white rounded">Enviar Mensagem</button></form>` : `<div class="text-center"><p class="mb-4">Faça login para deixar uma mensagem no nosso mural de recados!</p><button id="open-login-button" class="w-full py-2 px-4 bg-primary hover:bg-opacity-90 text-white font-medium rounded-lg">Fazer Login</button></div>`}</div><div id="guestbook-messages" class="space-y-4"></div></div>`;

        case 'gifts':
            return `<div class="space-y-6"><div class="text-center"><h1 class="text-3xl font-cursive mb-2">Lista de Presentes</h1></div>${user ? `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6"><p class="text-center text-gray-600 dark:text-gray-400 mb-6">Sua presença é o nosso maior presente! Mas se desejar nos presentear, preparamos com carinho esta lista de sugestões.</p><div id="gift-list-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"></div></div>` : `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 text-center"><i class="fas fa-lock text-3xl text-gray-400 mb-4"></i><h2 class="text-xl font-medium mb-2">Lista Exclusiva</h2><p class="text-gray-600 dark:text-gray-400">Para ver nossa lista de presentes, por favor, faça o login na aba "Acesso".</p></div>`}</div>`;

        case 'rsvp':
            if (user && accessKeyInfo) {
                const { guestName, allowedGuests, willAttendRestaurant, role } = accessKeyInfo.data;
                const dressCodeButtonHTML = specialRoles.includes(role)
                    ? `<button id="dress-code-button" class="bg-accent text-gray-800 font-bold py-4 px-4 rounded-lg hover:bg-opacity-90 transition-all col-span-1 md:col-span-2"><i class="fas fa-palette mr-2"></i>Manual de Vestimentas</button>`
                    : '';

                return `
                    <div class="space-y-8">
                        <div class="text-center"><h1 class="text-4xl font-cursive text-primary dark:text-dark-primary">Bem-vindo(a), ${guestName}!</h1><p class="text-gray-600 dark:text-gray-400 mt-2">Seu portal exclusivo para o nosso grande dia.</p></div>
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6"><h2 class="text-xl font-semibold mb-4 border-b pb-2">Sua Confirmação (RSVP)</h2><div class="flex items-center justify-between text-lg"><span><i class="fas fa-users fa-fw mr-2 text-gray-500"></i>Convidados:</span><span class="font-bold text-primary dark:text-dark-primary">${allowedGuests}</span></div><div class="flex items-center justify-between text-lg mt-2"><span><i class="fas fa-utensils fa-fw mr-2 text-gray-500"></i>Presença no Restaurante:</span><span class="font-bold ${willAttendRestaurant ? 'text-green-500' : 'text-red-500'}">${willAttendRestaurant ? 'Confirmada' : 'Não Confirmada'}</span></div></div>
                        <div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-6"><h2 class="text-xl font-semibold mb-4 border-b pb-2">Agenda do Dia</h2><ol class="relative border-l border-gray-200 dark:border-gray-700 ml-4"><li class="mb-10 ml-6"><span class="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-blue-900"><i class="fas fa-church text-blue-800 dark:text-blue-300"></i></span><h3 class="flex items-center mb-1 text-lg font-semibold text-gray-900 dark:text-white">Cerimônia</h3><time class="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">${formatTime(weddingDetails.weddingDate)}h</time><p class="text-base font-normal text-gray-500 dark:text-gray-400">${weddingDetails.venue}</p></li><li class="ml-6"><span class="absolute flex items-center justify-center w-8 h-8 bg-green-100 rounded-full -left-4 ring-8 ring-white dark:ring-gray-900 dark:bg-green-900"><i class="fas fa-glass-cheers text-green-800 dark:text-green-300"></i></span><h3 class="mb-1 text-lg font-semibold text-gray-900 dark:text-white">Recepção</h3><p class="text-base font-normal text-gray-500 dark:text-gray-400">${weddingDetails.restaurantName}</p></li></ol></div>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button id="manage-rsvp-button" class="bg-primary text-white font-bold py-4 px-4 rounded-lg hover:bg-opacity-90 transition-all"><i class="fas fa-edit mr-2"></i>Gerenciar Confirmação</button>
                            <button data-view-target="gifts" class="quick-nav-button bg-secondary text-gray-800 font-bold py-4 px-4 rounded-lg hover:bg-opacity-90 transition-all"><i class="fas fa-gift mr-2"></i>Ver Lista de Presentes</button>
                            <button data-view-target="guestbook" class="quick-nav-button bg-light-card dark:bg-dark-card font-bold py-4 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"><i class="fas fa-book-open mr-2"></i>Mural de Recados</button>
                            <button data-view-target="guest-photos" class="quick-nav-button bg-light-card dark:bg-dark-card font-bold py-4 px-4 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"><i class="fas fa-camera-retro mr-2"></i>Galeria de Fotos</button>
                            ${dressCodeButtonHTML}
                        </div>
                    </div>`;
            }
            return `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-8 max-w-lg mx-auto text-center"><i class="fas fa-key text-3xl text-gray-400 mb-4"></i><h2 class="text-xl font-medium mb-2">Área Exclusiva</h2><p class="text-gray-600 dark:text-gray-400 mb-6">Use sua chave de acesso para se cadastrar ou faça login para participar.</p><div class="space-y-3"><button id="open-signup-button" class="w-full py-3 px-4 bg-primary hover:bg-opacity-90 text-white font-semibold rounded-lg">Cadastrar com Chave de Acesso</button><button id="open-login-button" class="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg">Já tenho conta (Login)</button></div></div>`;
        default:
            return `<div class="text-center p-8"><h2 class="text-2xl font-bold mb-4">Página não encontrada</h2></div>`;
    }
}

export function renderView(viewName, user, weddingDetails, accessKeyInfo) {
    document.getElementById('main-content').innerHTML = generateViewHTML(viewName, user, weddingDetails, accessKeyInfo);
    updateNavButtons(viewName);
}

function updateNavButtons(activeView) {
    document.querySelectorAll('.nav-button').forEach(btn => {
        const isActive = btn.dataset.view === activeView;
        btn.classList.toggle('text-primary', isActive);
        btn.classList.toggle('dark:text-dark-primary', isActive);
        btn.classList.toggle('text-gray-500', !isActive);
        btn.classList.toggle('dark:text-gray-400', !isActive);
    });
}

export function updateCountdown(weddingDate) {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return null;
    if (!weddingDate || isNaN(weddingDate.getTime())) {
        countdownEl.innerHTML = `<div class="text-xl font-serif text-gray-500 dark:text-gray-400">Data não disponível</div>`;
        return null;
    }
    const targetTime = weddingDate.getTime();
    let intervalId = null;
    const update = () => {
        const distance = targetTime - new Date().getTime();
        if (distance < 0) {
            countdownEl.innerHTML = `<div class="text-xl font-serif text-primary dark:text-dark-primary">O grande dia chegou! 🎉</div>`;
            if (intervalId) clearInterval(intervalId);
            return;
        }
        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        countdownEl.innerHTML = `<div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(d).padStart(2, '0')}</div><div class="text-xs">Dias</div></div><div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(h).padStart(2, '0')}</div><div class="text-xs">Horas</div></div><div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(m).padStart(2, '0')}</div><div class="text-xs">Min</div></div><div class="bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg w-16"><div class="text-2xl font-bold text-primary dark:text-dark-primary">${String(s).padStart(2, '0')}</div><div class="text-xs">Seg</div></div>`;
    };
    update();
    intervalId = setInterval(update, 1000);
    return intervalId;
}

export function initializeCarousel() {
    const container = document.getElementById('carousel-container');
    if (!container) return;

    const track = container.querySelector('#carousel-track');
    const slides = Array.from(track.children);
    const nextButton = container.querySelector('.next');
    const prevButton = container.querySelector('.prev');
    const dotsNav = container.querySelector('.carousel-dots');
    const dots = dotsNav ? Array.from(dotsNav.children) : [];

    if (slides.length <= 1) return;

    const slideWidth = slides[0].getBoundingClientRect().width;
    let currentIndex = 0;

    const moveToSlide = (targetIndex) => {
        track.style.transform = 'translateX(-' + slideWidth * targetIndex + 'px)';
        dots[currentIndex]?.classList.remove('active');
        dots[targetIndex]?.classList.add('active');
        currentIndex = targetIndex;
    };

    nextButton.addEventListener('click', () => {
        const nextIndex = (currentIndex + 1) % slides.length;
        moveToSlide(nextIndex);
    });

    prevButton.addEventListener('click', () => {
        const prevIndex = (currentIndex - 1 + slides.length) % slides.length;
        moveToSlide(prevIndex);
    });

    dotsNav.addEventListener('click', e => {
        const targetDot = e.target.closest('.carousel-dot');
        if (!targetDot) return;
        const targetIndex = parseInt(targetDot.dataset.index);
        moveToSlide(targetIndex);
    });

    // Auto-play
    setInterval(() => {
        const nextIndex = (currentIndex + 1) % slides.length;
        moveToSlide(nextIndex);
    }, 5000); // Muda a cada 5 segundos
}


export function renderGuestPhotos(photos) {
    const gallery = document.getElementById('photo-gallery');
    if (!gallery) return;
    if (!Array.isArray(photos)) {
        gallery.innerHTML = `<p class="col-span-full text-center text-red-500">Erro ao carregar fotos</p>`;
        return;
    }
    if (photos.length === 0) {
        gallery.innerHTML = `<div class="col-span-full text-center py-12"><i class="fas fa-camera text-4xl text-gray-300 mb-4"></i><p class="text-gray-500">Seja o primeiro a compartilhar uma foto!</p></div>`;
    } else {
        gallery.innerHTML = photos.map(photo => `<div class="aspect-square bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden group"><a href="${photo.imageUrl}" target="_blank" aria-label="Ver foto de ${photo.userName || 'Convidado'} em tamanho real"><img src="${getOptimizedCloudinaryUrl(photo.imageUrl)}" alt="Foto de ${photo.userName || 'Convidado'}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'flex items-center justify-center h-full text-gray-400\\'>Erro</div>'"></a></div>`).join('');
    }
}

export function renderTimeline(events) {
    const container = document.getElementById('timeline-container');
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `<div class="text-center p-8 bg-light-card dark:bg-dark-card rounded-xl"><p class="text-gray-500">Nossa história está sendo escrita... Volte em breve!</p></div>`;
        return;
    }

    container.innerHTML = `<div class="relative border-l-2 border-primary/20 dark:border-dark-primary/20 ml-6 space-y-12">` +
        events.map(event => {
            const formattedDate = new Date(event.date).toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
            const imageHTML = event.imageUrl ? `<img src="${getOptimizedCloudinaryUrl(event.imageUrl, 'w_600,c_fill,q_auto')}" class="rounded-lg shadow-lg mt-4" alt="${event.title}">` : '';

            return `
            <div class="ml-6">
                <span class="absolute -left-[1.8rem] flex items-center justify-center w-12 h-12 bg-primary rounded-full ring-8 ring-light-background dark:ring-dark-background">
                    <i class="fas fa-heart text-white text-xl"></i>
                </span>
                <div class="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
                    <time class="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">${formattedDate}</time>
                    <h3 class="text-2xl font-serif font-semibold text-gray-900 dark:text-white mb-2">${event.title}</h3>
                    <p class="text-base font-normal text-gray-600 dark:text-gray-300">${event.description}</p>
                    ${imageHTML}
                </div>
            </div>`;
        }).join('') + `</div>`;
}

export function renderGuestbookMessages(messages) {
    const container = document.getElementById('guestbook-messages');
    if (!container) return;
    if (messages.length === 0) {
        container.innerHTML = `<p class="text-center text-gray-500">Ainda não há mensagens. Seja o primeiro!</p>`;
    } else {
        container.innerHTML = messages.map(msg => `<div class="bg-light-card dark:bg-dark-card rounded-xl shadow-md p-4"><p class="text-gray-800 dark:text-gray-200">${msg.message}</p><p class="text-xs text-gray-500 dark:text-gray-400 text-right mt-2">- ${msg.userName}</p></div>`).join('');
    }
}

// ========= MODIFICADO NOVAMENTE (removido o indicador "Contribuído") =========
export function renderGiftList(gifts, currentUser) {
    const container = document.getElementById('gift-list-container');
    if (!container) return;

    const donationCardHTML = `
        <div class="bg-white dark:bg-dark-card border-2 border-dashed dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between transition-all items-center text-center">
            <div>
                <i class="fas fa-hand-holding-heart text-4xl text-primary dark:text-dark-primary mb-4"></i>
                <h3 class="font-semibold text-gray-800 dark:text-gray-200">Presente dos Noivos</h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">Sinta-se à vontade para nos presentear com qualquer valor para nossa lua de mel!</p>
                <div class="flex items-center justify-center">
                    <span class="text-lg font-bold text-gray-500 mr-2">R$</span>
                    <input type="number" id="custom-gift-amount" min="10" step="1" placeholder="50,00" class="w-32 p-2 text-center text-lg font-bold border rounded dark:bg-gray-800 dark:border-gray-600">
                </div>
            </div>
            <div class="mt-4 w-full">
                <button id="present-custom-amount-btn" class="w-full py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90"><i class="fas fa-qrcode mr-2"></i>Presentear com PIX</button>
            </div>
        </div>
    `;

    if (gifts.length === 0) {
        container.innerHTML = donationCardHTML + `<p class="col-span-full text-center text-gray-500">A nossa lista de presentes está a ser preparada com carinho. Volte em breve!</p>`;
        return;
    }

    const giftCardsHTML = gifts.map(gift => {
        const contributors = gift.contributors || [];
        const isTakenByMe = contributors.some(c => c.userId === currentUser.uid);
        // A variável 'hasContributors' ainda é útil para o 'isTakenByMe', mas não será mais usada para exibir um indicador público.
        // const hasContributors = contributors.length > 0; 

        const optimizedImageUrl = getOptimizedCloudinaryUrl(gift.imageUrl, 'w_400,h_300,c_fill,q_auto');
        const formattedPrice = gift.price ? `R$ ${Number(gift.price).toFixed(2).replace('.', ',')}` : 'Valor simbólico';

        // Removido: O indicador visual de que já foi contribuído, para não sugerir que não pode mais doar.
        // const contributionIndicatorHTML = hasContributors
        //     ? `<div class="absolute top-2 right-2 text-xs font-bold text-white bg-green-500 px-2 py-1 rounded-full shadow-lg">Contribuído</div>`
        //     : '';

        const actionButtonHTML = isTakenByMe
            ? `<button data-id="${gift.id}" aria-label="Desfazer contribuição" class="unmark-gift-btn w-full py-2 text-sm bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">Desfazer contribuição</button>`
            : `<button data-id="${gift.id}" data-name="${gift.name}" data-price="${gift.price}" aria-label="Presentear com ${gift.name} via PIX" class="present-with-pix-btn w-full py-2 text-sm bg-primary text-white rounded hover:bg-opacity-90"><i class="fas fa-qrcode mr-2"></i>Contribuir com PIX</button>`;

        return `
            <div class="bg-white dark:bg-dark-card border dark:border-gray-700 rounded-lg p-4 flex flex-col justify-between transition-all relative">
                <div>
                    <img src="${optimizedImageUrl}" alt="${gift.name}" class="w-full h-40 object-cover rounded-md mb-4">
                    <h3 class="font-semibold text-gray-800 dark:text-gray-200">${gift.name}</h3>
                    <p class="text-lg font-bold text-primary dark:text-dark-primary mt-2">${formattedPrice}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${gift.description || ''}</p>
                </div>
                <div class="mt-4">
                    ${actionButtonHTML}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = donationCardHTML + giftCardsHTML;
}
// ========= FIM DA MODIFICAÇÃO NOVAMENTE =========

function addFormValidation() {
    document.querySelectorAll('input[required], textarea[required]').forEach(input => {
        input.addEventListener('blur', (e) => e.target.classList.toggle('border-red-500', !e.target.validity.valid));
    });
}

function generateGuestNameInputs(containerId, count, existingNames = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Por favor, confirme os nomes dos convidados:</label>`;
    for (let i = 0; i < count; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'guest-name-input w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600';
        input.placeholder = `Nome do Convidado ${i + 1}`;
        input.value = existingNames[i] || '';
        input.required = true;
        container.appendChild(input);
    }
}

export function renderAuthForm(type, accessKey = '', keyData = null) {
    const authFormContainer = document.getElementById('auth-form-container');
    if (!authFormContainer) return;
    const socialLoginButtons = `<div class="my-4 flex items-center before:flex-1 before:border-b after:flex-1 after:border-b"><p class="text-center text-xs mx-4 text-gray-500">OU</p></div><div class="space-y-3"><button id="google-login-modal-button" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition-colors"><i class="fab fa-google mr-2"></i>Entrar com Google</button></div>`;
    const socialSignupButtons = `<div class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"><h3 class="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">Cadastro Rápido (Requer Chave)</h3><div class="space-y-2"><button id="google-signup-button" class="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center transition-colors"><i class="fab fa-google mr-2"></i>Cadastrar com Google</button></div></div><div class="my-4 flex items-center before:flex-1 before:border-b after:flex-1 after:border-b"><p class="text-center text-xs mx-4 text-gray-500">OU COM EMAIL</p></div>`;
    authFormContainer.innerHTML = type === 'login' ? `<h2 class="text-2xl font-serif mb-4 text-center">Login</h2><form id="login-form" class="space-y-4" novalidate><div><label class="block text-sm">Email</label><input type="email" id="login-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div><div><label class="block text-sm">Senha</label><input type="password" id="login-password" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div><button type="submit" class="w-full py-2 bg-primary text-white rounded">Entrar</button><p class="text-sm text-center">Não tem conta? <button type="button" id="show-signup" class="text-primary font-semibold">Cadastre-se</button></p></form>${socialLoginButtons}` : `<h2 class="text-2xl font-serif mb-4 text-center">Cadastro de Convidado</h2>${socialSignupButtons}<form id="signup-form" class="space-y-4" novalidate><div><label class="block text-sm">Chave de Acesso</label><input type="text" id="signup-key" value="${accessKey}" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required ${accessKey ? 'readonly' : ''}></div><div id="guest-names-container"></div><div class="border-t pt-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Você irá conosco ao restaurante?</label><div class="flex space-x-4 mt-2"><label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="yes" class="text-primary" checked><span class="ml-2">Sim, irei!</span></label><label class="inline-flex items-center"><input type="radio" name="attend-restaurant" value="no" class="text-primary"><span class="ml-2">Apenas cerimônia</span></label></div></div><div><label class="block text-sm">Seu Email</label><input type="email" id="signup-email" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div><div><label class="block text-sm">Crie uma Senha (mín. 6 caracteres)</label><input type="password" id="signup-password" minlength="6" class="w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600" required></div><button type="submit" class="w-full py-2 bg-primary text-white rounded">Confirmar e Cadastrar com Email</button><p class="text-sm text-center">Já tem conta? <button type="button" id="show-login" class="text-primary font-semibold">Faça login</button></p></form>`;
    toggleAuthModal(true);
    if (type === 'signup' && keyData) generateGuestNameInputs('guest-names-container', keyData.allowedGuests);
    addFormValidation();
}

export function toggleAuthModal(show) { document.getElementById('auth-modal').classList.toggle('hidden', !show); }

function generateQRCode(pixCode) {
    const placeholder = document.getElementById('qr-placeholder');
    if (!placeholder) return;
    placeholder.innerHTML = '';
    if (window.QRCode) {
        try { new window.QRCode(placeholder, { text: pixCode, width: 192, height: 192, colorDark: "#000000", colorLight: "#ffffff", correctLevel: window.QRCode.CorrectLevel.H }); }
        catch (error) { console.error("Erro ao gerar QR Code:", error); showQRCodeFallback(placeholder); }
    } else { console.warn("QRCode.js não está disponível"); showQRCodeFallback(placeholder); }
}

function showQRCodeFallback(placeholder) { placeholder.innerHTML = `<div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-8 text-center"><i class="fas fa-qrcode text-4xl text-gray-500 mb-2"></i><p class="text-sm text-gray-600 dark:text-gray-400">QR Code indisponível</p><p class="text-xs text-gray-500 mt-1">Use o código PIX abaixo</p></div>`; }

export function renderPixModal(gift, weddingDetails) {
    const pixContainer = document.getElementById('pix-content-container');
    if (!pixContainer || !weddingDetails.pixKey) { showToast('A chave PIX dos noivos não foi configurada.', 'error'); return; }
    pixContainer.innerHTML = `<div class="flex justify-center items-center p-10"><i class="fas fa-spinner fa-spin text-3xl text-primary"></i></div>`;
    togglePixModal(true);
    try {
        const pixCode = generatePixCode(
            weddingDetails.pixKey,
            'casar',
            'SALVADOR',
            parseFloat(gift.price),
            gift.id
        );
        pixContainer.innerHTML = `<div class="text-center"><h2 class="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Presentear com PIX</h2><p class="text-gray-600 dark:text-gray-400 mb-4">Você está a presentear com: <strong>${gift.name}</strong></p><div id="qr-placeholder" class="flex justify-center p-2 bg-white rounded-lg mx-auto mb-4 w-[208px] h-[208px]"></div><p class="text-lg font-bold text-primary dark:text-dark-primary mt-4">Valor: R$ ${parseFloat(gift.price).toFixed(2).replace('.', ',')}</p><div class="mt-6"><p class="text-sm font-medium mb-2">1. Abra a app do seu banco e aponte a câmara para o QR Code.</p><p class="text-sm font-medium mb-4">2. Ou use o PIX Copia e Cola abaixo:</p><div class="flex items-center"><input id="pix-copy-paste" type="text" readonly value="${pixCode}" class="w-full p-2 text-xs bg-gray-200 dark:bg-gray-800 border rounded-l-md"><button id="copy-pix-button" aria-label="Copiar código PIX" class="bg-gray-300 dark:bg-gray-700 px-4 py-2 border-y border-r rounded-r-md hover:bg-gray-400"><i class="fas fa-copy"></i></button></div></div><div class="mt-8 border-t dark:border-gray-700 pt-4"><p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Após realizar o pagamento no seu banco, clique no botão abaixo para confirmar o seu presente.</p><button id="confirm-gift-button" data-id="${gift.id}" class="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"><i class="fas fa-check-circle mr-2"></i>Já fiz o PIX, confirmar presente!</button></div></div>`;
        setTimeout(() => { generateQRCode(pixCode); }, 100);
    } catch (error) {
        console.error("Erro ao gerar PIX:", error);
        pixContainer.innerHTML = `<div class="text-center p-8"><i class="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i><p class="text-red-500 font-medium">Ocorreu um erro ao gerar o código PIX.</p><p class="text-gray-600 dark:text-gray-400 text-sm mt-2">Por favor, tente novamente.</p></div>`;
    }
}

function generatePixCode(pixKey, receiverName, city, amount, transactionId) {
    const format = (id, val) => {
        const len = val.length.toString().padStart(2, '0');
        return `${id}${len}${val}`;
    };

    const getPayload = (key, txid, amount, receiver, city) => {
        txid = (txid || '***').substring(0, 25);
        amount = amount ? amount.toFixed(2) : null;
        receiver = receiver.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25);
        city = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 15);

        const payload = [
            format('00', '01'),
            format('26', `${format('00', 'BR.GOV.BCB.PIX')}${format('01', key)}`),
            format('52', '0000'),
            format('53', '986'),
            ...(amount ? [format('54', amount)] : []),
            format('58', 'BR'),
            format('59', receiver),
            format('60', city),
            format('62', format('05', txid)),
        ].join('');

        return `${payload}6304`;
    };

    const crc16 = (payload) => {
        let crc = 0xFFFF;
        const polynomial = 0x1021;
        for (let i = 0; i < payload.length; i++) {
            const byte = payload.charCodeAt(i);
            crc ^= (byte << 8);
            for (let j = 0; j < 8; j++) {
                crc = (crc & 0x8000) ? (crc << 1) ^ polynomial : crc << 1;
            }
        }
        return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    };

    const payload = getPayload(pixKey, transactionId, amount, receiverName, city);
    const checksum = crc16(payload);

    return `${payload}${checksum}`;
}

export function togglePixModal(show) { document.getElementById('pix-modal').classList.toggle('hidden', !show); }

export function initializeGiftEventListeners(weddingDetails, currentUser) {
    const container = document.getElementById('gift-list-container');
    if (!container) return;
    container.addEventListener('click', (e) => {
        const pixButton = e.target.closest('.present-with-pix-btn');
        if (pixButton) {
            const gift = { id: pixButton.dataset.id, name: pixButton.dataset.name, price: parseFloat(pixButton.dataset.price) };
            renderPixModal(gift, weddingDetails);
        }
    });
}

export function renderRsvpManagementModal(keyData, existingNames, submitHandler) {
    const container = document.getElementById('rsvp-form-container');
    if (!container) return;
    container.innerHTML = `<h2 class="text-2xl font-serif mb-4 text-center">Gerenciar Confirmação</h2><form id="rsvp-update-form" class="space-y-4" novalidate><div id="guest-names-update-container"></div><div class="border-t pt-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Você irá conosco ao restaurante?</label><div class="flex space-x-4 mt-2"><label class="inline-flex items-center"><input type="radio" name="attend-restaurant-update" value="yes" class="text-primary" ${keyData.willAttendRestaurant ? 'checked' : ''}><span class="ml-2">Sim, irei!</span></label><label class="inline-flex items-center"><input type="radio" name="attend-restaurant-update" value="no" class="text-primary" ${!keyData.willAttendRestaurant ? 'checked' : ''}><span class="ml-2">Apenas cerimônia</span></label></div></div><button type="submit" class="w-full py-2 bg-primary text-white rounded">Salvar Alterações</button></form>`;
    generateGuestNameInputs('guest-names-update-container', keyData.allowedGuests, existingNames);
    document.getElementById('rsvp-update-form').addEventListener('submit', submitHandler);
    toggleRsvpModal(true);
}

export function toggleRsvpModal(show) { document.getElementById('rsvp-modal').classList.toggle('hidden', !show); }

export function showSocialSignupModal(keyData, onComplete) {
    const modalHTML = `<div id="social-signup-modal" class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"><div class="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4"><h3 class="text-lg font-semibold mb-4">Complete seu cadastro</h3><form id="social-signup-form" class="space-y-4"><div id="social-guest-names-container"></div><div class="border-t pt-4"><label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Você irá conosco ao restaurante?</label><div class="flex space-x-4 mt-2"><label class="inline-flex items-center"><input type="radio" name="social-attend-restaurant" value="yes" class="text-primary" checked><span class="ml-2">Sim, irei!</span></label><label class="inline-flex items-center"><input type="radio" name="social-attend-restaurant" value="no" class="text-primary"><span class="ml-2">Apenas cerimônia</span></label></div></div><div class="flex space-x-3 pt-4"><button type="button" id="cancel-social-signup" class="flex-1 py-2 px-4 bg-gray-300 text-gray-700 rounded">Cancelar</button><button type="submit" class="flex-1 py-2 px-4 bg-primary text-white rounded">Confirmar</button></div></form></div></div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    const container = document.getElementById('social-guest-names-container');
    container.innerHTML = `<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirme os nomes dos convidados:</label>`;
    for (let i = 0; i < keyData.allowedGuests; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'social-guest-name-input w-full mt-1 p-2 rounded border dark:bg-gray-800 dark:border-gray-600';
        input.placeholder = `Nome do Convidado ${i + 1}`;
        input.required = true;
        container.appendChild(input);
    }
    document.getElementById('cancel-social-signup').addEventListener('click', () => document.getElementById('social-signup-modal').remove());
    document.getElementById('social-signup-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const guestNames = Array.from(document.querySelectorAll('.social-guest-name-input')).map(input => input.value.trim()).filter(name => name);
        const willAttendRestaurant = document.querySelector('input[name="social-attend-restaurant"]:checked')?.value === 'yes';
        if (guestNames.length === 0) { showToast('Pelo menos um nome de convidado é obrigatório.', 'error'); return; }
        document.getElementById('social-signup-modal').remove();
        onComplete({ guestNames, willAttendRestaurant });
    });
}

export function renderDressCodeModal(palettes, userRole) {
    const modal = document.getElementById('dress-code-modal');
    const container = document.getElementById('dress-code-content-container');

    if (!palettes[userRole] || palettes[userRole].length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-tshirt text-6xl text-gray-300 mb-4"></i>
                <h2 class="text-2xl font-bold mb-4">Dress Code</h2>
                <p class="text-gray-600 dark:text-gray-400">
                    Não há paleta de cores específica para seu grupo.
                    Use o dress code geral do evento.
                </p>
            </div>
        `;
    } else {
        const colorsHTML = palettes[userRole].map(color => `
            <div class="flex flex-col items-center">
                <div class="w-16 h-16 rounded-full border-4 border-white shadow-lg mb-2" style="background-color: ${color};"></div>
                <span class="text-xs font-mono text-gray-600 dark:text-gray-400">${color.toUpperCase()}</span>
            </div>
        `).join('');

        container.innerHTML = `
            <div class="text-center">
                <i class="fas fa-palette text-6xl text-primary dark:text-dark-primary mb-4"></i>
                <h2 class="text-2xl font-bold mb-2">Paleta de Cores</h2>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
                    Especial para: <strong>${userRole}</strong>
                </p>
                
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-4 mb-8">
                    ${colorsHTML}
                </div>
                
                <div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6">
                    <h3 class="font-semibold mb-2 text-sm">Dicas:</h3>
                    <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li>• Use estas cores como base para sua roupa</li>
                        <li>• Combine com tons neutros</li>
                        <li>• Evite branco (reservado para a noiva)</li>
                    </ul>
                </div>
                
                <div class="space-y-3">
                    <button id="download-pdf-dress-code" class="w-full bg-primary hover:bg-primary/90 text-white py-3 px-4 rounded-lg transition-colors flex items-center justify-center">
                        <i class="fas fa-file-pdf mr-2"></i>
                        Baixar Manual Completo (PDF)
                    </button>
                    
                    <button id="share-dress-code" class="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors flex items-center justify-center">
                        <i class="fas fa-share-alt mr-2"></i>
                        Compartilhar
                    </button>
                </div>
            </div>
        `;
    }

    modal.classList.remove('hidden');
}
export function toggleDressCodeModal(show) { document.getElementById('dress-code-modal').classList.toggle('hidden', !show); }

export function showTutorialModal(onComplete) {
    const modal = document.getElementById('tutorial-modal');
    const contentContainer = document.getElementById('tutorial-content-container');
    const navContainer = document.getElementById('tutorial-nav');

    const tutorialSteps = [
        {
            icon: 'fas fa-heart',
            title: 'Bem-vindo(a)!',
            content: 'Este é nosso convite digital interativo! Aqui você encontrará todas as informações sobre nosso grande dia.',
            color: 'text-red-500'
        },
        {
            icon: 'fas fa-user-plus',
            title: 'Faça seu Cadastro',
            content: 'Para aceder a todas as funcionalidades, você precisa de se cadastrar usando a chave de acesso que enviamos. Isso ajuda-nos a organizar melhor o evento!',
            color: 'text-blue-500'
        },
        {
            icon: 'fas fa-camera',
            title: 'Compartilhe Momentos',
            content: 'Envie fotos suas e dos preparativos! Elas aparecerão na nossa galeria partilhada.',
            color: 'text-green-500'
        },
        {
            icon: 'fas fa-gift',
            title: 'Lista de Presentes',
            content: 'Consulte nossa lista de presentes e contribua via PIX de forma prática e segura. Você também pode dar um valor personalizado!',
            color: 'text-yellow-500'
        },
        {
            icon: 'fas fa-book-open',
            title: 'Mural de Recados',
            content: 'Deixe uma mensagem carinhosa para nós! Todos os recados ficarão guardados como lembrança deste dia especial.',
            color: 'text-purple-500'
        },
        {
            icon: 'fas fa-palette',
            title: 'Paleta de Cores',
            content: 'Se você é padrinho, madrinha ou tem função especial, pode aceder à sua paleta de cores personalizada e baixar um manual em PDF!',
            color: 'text-indigo-500'
        }
    ];

    let currentStep = 0;

    const renderStep = () => {
        const step = tutorialSteps[currentStep];
        contentContainer.innerHTML = `
            <div class="text-center">
                <div class="mb-6">
                    <i class="${step.icon} text-6xl ${step.color}"></i>
                </div>
                <h2 class="text-2xl font-bold mb-4">${step.title}</h2>
                <p class="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
                    ${step.content}
                </p>
                <div class="flex justify-center space-x-2 mb-4">
                    ${tutorialSteps.map((_, index) => `
                        <div class="w-2 h-2 rounded-full ${index === currentStep ? 'bg-primary dark:bg-dark-primary' : 'bg-gray-300 dark:bg-gray-600'}"></div>
                    `).join('')}
                </div>
            </div>
        `;

        navContainer.innerHTML = `
            <button id="tutorial-prev" class="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ${currentStep === 0 ? 'invisible' : ''}">
                <i class="fas fa-chevron-left mr-1"></i> Anterior
            </button>
            <div class="text-sm text-gray-500 dark:text-gray-400">
                ${currentStep + 1} de ${tutorialSteps.length}
            </div>
            <button id="tutorial-next" class="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg">
                ${currentStep === tutorialSteps.length - 1 ? 'Começar!' : 'Próximo'} 
                ${currentStep < tutorialSteps.length - 1 ? '<i class="fas fa-chevron-right ml-1"></i>' : ''}
            </button>
        `;

        // Event listeners
        document.getElementById('tutorial-prev')?.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep--;
                renderStep();
            }
        });

        document.getElementById('tutorial-next')?.addEventListener('click', () => {
            if (currentStep < tutorialSteps.length - 1) {
                currentStep++;
                renderStep();
            } else {
                modal.classList.add('hidden');
                onComplete();
            }
        });
    };

    renderStep();
    modal.classList.remove('hidden');
}
export function toggleTutorialModal(show) { document.getElementById('tutorial-modal').classList.toggle('hidden', !show); }