import './style.css'
import { createSpinningModel } from './threeModelLoader.js'

// Date and time display functions
function formatDateTime() {
  const now = new Date()
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                 'July', 'August', 'September', 'October', 'November', 'December']
  const month = months[now.getMonth()]
  const day = now.getDate()
  const year = now.getFullYear()
  
  let hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'
  const timeString = `${hours}:${minutes} ${ampm}`
  
  // Get timezone abbreviation
  const timeZone = Intl.DateTimeFormat('en', { timeZoneName: 'short' }).formatToParts(now)
    .find(part => part.type === 'timeZoneName')?.value || 'PDT'
  
  return `${month} ${day}, ${year} ${timeString} ${timeZone}`
}

function updateDateTime() {
  const dateTimeElement = document.querySelector('.date-time-display')
  if (dateTimeElement) {
    dateTimeElement.textContent = formatDateTime()
  }
}

let dateTimeInterval = null

function startDateTimeUpdates() {
  // Clear any existing interval
  if (dateTimeInterval) {
    clearInterval(dateTimeInterval)
  }
  // Update immediately and then every second
  updateDateTime()
  dateTimeInterval = setInterval(updateDateTime, 1000)
}

function addDateTimeDisplay(container) {
  const dateTimeDiv = document.createElement('div')
  dateTimeDiv.className = 'date-time-display'
  dateTimeDiv.textContent = formatDateTime()
  container.appendChild(dateTimeDiv)
  
  // Update every second
  setInterval(updateDateTime, 1000)
}

// Basket state management
let basket = []

function addToBasket(productName, color, size) {
  basket.push({
    id: Date.now(),
    name: productName,
    color: color,
    size: size,
    quantity: 1
  })
  console.log('Added to basket:', basket)
}

function removeFromBasket(id) {
  basket = basket.filter(item => item.id !== id)
}

function getBasketTotal() {
  return basket.reduce((total, item) => total + (item.quantity * 1), 0) // Assuming $1 per item for now
}

// Audio context for sound generation (lazy initialization)
let audioContext = null

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  // Resume audio context if suspended (required after user interaction)
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

// Play trash can sound effect
function playTrashSound() {
  try {
    // Try to load an audio file if it exists
    const audio = new Audio('/trash-sound.mp3')
    audio.volume = 0.9 // Increased volume
    audio.play().catch(err => {
      console.log('Audio file not found, using generated sound:', err)
      // If file doesn't exist, generate a simple sound
      generateTrashSound()
    })
  } catch (err) {
    console.log('Error loading audio file:', err)
    // Fallback to generated sound
    generateTrashSound()
  }
}

// Generate a simple trash can sound using Web Audio API
function generateTrashSound() {
  try {
    const ctx = getAudioContext()
    
    // Create multiple oscillators for a richer sound
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gainNode = ctx.createGain()
    const masterGain = ctx.createGain()
    
    // First oscillator - lower frequency "whoosh"
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(150, ctx.currentTime)
    osc1.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2)
    
    // Second oscillator - higher frequency for texture
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(300, ctx.currentTime)
    osc2.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2)
    
    // Mix the oscillators
    osc1.connect(gainNode)
    osc2.connect(gainNode)
    gainNode.connect(masterGain)
    masterGain.connect(ctx.destination)
    
    // Envelope for the sound
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime) // Increased volume
    masterGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
    
    osc1.start(ctx.currentTime)
    osc2.start(ctx.currentTime)
    osc1.stop(ctx.currentTime + 0.2)
    osc2.stop(ctx.currentTime + 0.2)
  } catch (err) {
    console.log('Could not play sound:', err)
  }
}

// Show boot screen first
async function showBootScreen() {
  // Load SVG content inline so we can manipulate it
  const response = await fetch('/loading screen.svg')
  const svgContent = await response.text()
  
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="boot-screen">
            <div class="boot-screen-svg-container"></div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Inject SVG into container
  const container = document.querySelector('.boot-screen-svg-container')
  container.innerHTML = svgContent
  
  // Find the SVG element
  const svg = container.querySelector('svg')
  
  if (svg) {
    // Find the progress bar background - the rect at y="220" (the progress bar container)
    const progressBarBg = svg.querySelector('rect[y="220"]')
    
    if (progressBarBg) {
      // Get the dimensions and position
      const bgX = parseFloat(progressBarBg.getAttribute('x'))
      const bgY = parseFloat(progressBarBg.getAttribute('y'))
      const bgWidth = parseFloat(progressBarBg.getAttribute('width'))
      const bgHeight = parseFloat(progressBarBg.getAttribute('height'))
      
      // Update the background bar to have the correct fill and stroke on the outside
      progressBarBg.setAttribute('fill', '#CDCFFF')
      progressBarBg.setAttribute('stroke', '#3E3D42')
      progressBarBg.setAttribute('stroke-width', '1')
      progressBarBg.setAttribute('stroke-linejoin', 'miter')
      
      // Create progress fill element with color #424242
      // Position it slightly inside to account for the stroke
      const strokeWidth = 1
      const progressFill = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      progressFill.setAttribute('x', (bgX + strokeWidth).toString())
      progressFill.setAttribute('y', (bgY + strokeWidth).toString())
      progressFill.setAttribute('width', '0')
      progressFill.setAttribute('height', (bgHeight - strokeWidth * 2).toString())
      progressFill.setAttribute('fill', '#424242')
      progressFill.setAttribute('id', 'progress-fill')
      // No stroke on the progress fill
      
      // Insert progress fill after the background so it appears on top
      progressBarBg.parentNode.insertBefore(progressFill, progressBarBg.nextSibling)
      
      // Animate progress bar from left to right
      let progress = 0
      const interval = setInterval(() => {
        progress += 2
        if (progress <= 100) {
          // Calculate width accounting for the stroke
          const maxFillWidth = bgWidth - (strokeWidth * 2)
          const newWidth = (maxFillWidth * progress) / 100
          progressFill.setAttribute('width', newWidth.toString())
        } else {
          clearInterval(interval)
          // Progress bar complete - immediately show main site (no transition)
          document.body.classList.add('booted')
          showMainContent()
        }
      }, 50)
    }
  }
}

function showMainContent() {
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="shop-container">
            <!-- Top Navigation Bar -->
            <nav class="top-nav-bar">
              <div class="nav-btn nav-btn-left active">Home</div>
              <div class="nav-btn nav-btn-left">softwear</div>
              <div class="nav-btn nav-btn-left">hardwear</div>
              <div class="nav-btn nav-btn-right">basket</div>
            </nav>
            
            <!-- Main Content Area -->
            <div class="shop-content home-content">
              <div class="hero-section">
                <div class="hero-content">
                  <div class="hero-content-wrapper">
                    <div class="hero-text">
                      <h1 class="hero-title">Welcome to Nostalgia <span class="hero-title-accent">OS</span></h1>                    
                      <p class="hero-subtitle">Classic style meets modern comfort</p>
                      <p class="hero-description">Discover our collection of retro-inspired softwear and hardwear. Get notified when new items arrive.</p>
                      <img src="/offgetnotified.svg" alt="Get Notified" class="hero-notify-img" />
                    </div>
                    <div class="iphone-container">
                      <img src="/iPhoneoriginal.svg" alt="Original iPhone" class="iphone-frame" />
                      <div class="iphone-screen">
                        <!-- Interface will go here -->
                      </div>
                    </div>
                  </div>
                  <div class="hero-bottom-boxes">
                    <div class="bottom-box promo-clickable" data-page="softwear">
                    </div>
                    <div class="bottom-box promo-clickable" data-page="hardwear">
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Date and Time Display -->
            <div class="date-time-display">${formatDateTime()}</div>
          </div>
        </div>
      </div>
    </div>
  `

  // Start date/time updates
  startDateTimeUpdates()

  // Add navigation click handlers
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
      this.classList.add('active')
    })
  })

  // Add navigation button click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const buttonText = this.textContent.trim().toLowerCase()
      
      // Update active state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      
      // Navigate based on button
      if (buttonText === 'softwear') {
        showSoftwearPage()
      } else if (buttonText === 'home') {
        showMainContent()
      } else if (buttonText === 'hardwear') {
        showHardwearPage()
      } else if (buttonText === 'basket') {
        showBasketPage()
      }
    })
  })
  
  // Hero promotional boxes click handlers
  document.querySelectorAll('.promo-clickable').forEach(box => {
    box.addEventListener('click', function() {
      const page = this.getAttribute('data-page')
      if (page === 'softwear') {
        showSoftwearPage()
      } else if (page === 'hardwear') {
        showHardwearPage()
      }
    })
  })
  
  // Hero "Get Notified" image handler
  const heroNotifyImg = document.querySelector('.hero-notify-img')
  if (heroNotifyImg) {
    heroNotifyImg.addEventListener('click', function() {
      showNotifyModal('new items')
    })
    
    // Swap image on hover
    heroNotifyImg.addEventListener('mouseenter', function() {
      this.src = '/ongetnotified.svg'
    })
    
    heroNotifyImg.addEventListener('mouseleave', function() {
      this.src = '/offgetnotified.svg'
    })
  }
}

function showSoftwearPage() {
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="shop-container">
            <!-- Top Navigation Bar -->
            <nav class="top-nav-bar">
              <div class="nav-btn nav-btn-left">Home</div>
              <div class="nav-btn nav-btn-left active">softwear</div>
              <div class="nav-btn nav-btn-left">hardwear</div>
              <div class="nav-btn nav-btn-right">basket</div>
            </nav>
            
            <!-- Softwear Content Area -->
            <div class="shop-content">
              <div class="softwear-content">
                <div class="products-grid">
                  <div class="product-item product-clickable" data-product="essentials-01">
                    <div class="product-header">
                      <div class="product-name">The Essentials</div>
                      <div class="product-price">$69</div>
                    </div>
                    <img src="/cigtshirt.svg" alt="T-Shirt" class="product-image" />
                  </div>
                  <div class="product-item product-clickable" data-product="essentials-02">
                    <div class="product-header">
                      <div class="product-name">Jeans</div>
                      <div class="product-price">$99</div>
                    </div>
                    <img src="/jeans1.svg" alt="Jeans" class="product-image" />
                  </div>
                  <div class="product-item product-clickable" data-product="essentials-03">
                    <div class="product-header">
                      <div class="product-name">Hoodie</div>
                      <div class="product-price">$101</div>
                    </div>
                    <img src="/finderhoodie.svg" alt="Hoodie" class="product-image" />
                  </div>
                </div>
              </div>
            </div>
            <!-- Date and Time Display -->
            <div class="date-time-display">${formatDateTime()}</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Start date/time updates
  startDateTimeUpdates()
  
  // Add navigation button click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const buttonText = this.textContent.trim().toLowerCase()
      
      // Update active state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      
      // Navigate based on button
      if (buttonText === 'softwear') {
        showSoftwearPage()
      } else if (buttonText === 'home') {
        showMainContent()
      } else if (buttonText === 'hardwear') {
        showHardwearPage()
      } else if (buttonText === 'basket') {
        showBasketPage()
      }
    })
  })
  
  // Make product items clickable to go to product detail page
  document.querySelectorAll('.product-clickable').forEach(item => {
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking on selectors or buttons
      if (e.target.closest('.product-selectors') || e.target.closest('.add-to-cart-btn')) {
        return
      }
      
      const productId = this.getAttribute('data-product')
      const productName = this.querySelector('.product-name').textContent
      const productPrice = this.querySelector('.product-price').textContent
      
      if (productId === 'essentials-01') {
        showProductDetailPage('essentials-01', 'The Essentials', '/cigtshirt.svg', productPrice, 'softwear')
      } else if (productId === 'essentials-02') {
        showProductDetailPage('essentials-02', 'Jeans', '/jeans1.svg', productPrice, 'softwear')
      } else if (productId === 'essentials-03') {
        showProductDetailPage('essentials-03', 'Hoodie', '/finderhoodie.svg', productPrice, 'softwear')
      }
    })
  })
  
  // Add to cart button handlers with animation
  document.querySelectorAll('.add-to-cart-btn').forEach((btn, index) => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation() // Prevent product item click
      
      // Play sound immediately when button is clicked
      playTrashSound()
      
      const productItem = this.closest('.product-item')
      const productName = productItem.querySelector('.product-name').textContent
      const productImage = productItem.querySelector('.product-image')
      const colorSelect = productItem.querySelector('.color-select')
      const sizeSelect = productItem.querySelector('.size-select')
      const color = colorSelect ? colorSelect.value : 'White'
      const size = sizeSelect ? sizeSelect.value : 'M'
      
      // Get positions for animation
      const imageRect = productImage.getBoundingClientRect()
      const basketBtn = document.querySelector('.nav-btn:last-child')
      const basketRect = basketBtn ? basketBtn.getBoundingClientRect() : null
      
      if (basketRect && productImage) {
        // Create flying t-shirt element
        const flyingShirt = document.createElement('div')
        flyingShirt.className = 'flying-shirt'
        flyingShirt.innerHTML = `<img src="${productImage.src}" alt="Flying shirt" />`
        
        // Set initial position
        const startX = imageRect.left + imageRect.width / 2
        const startY = imageRect.top + imageRect.height / 2
        const targetX = basketRect.left + basketRect.width / 2
        const targetY = basketRect.top + basketRect.height / 2
        
        // Calculate curved path (arc upward then down)
        const midX = (startX + targetX) / 2
        const midY = Math.min(startY, targetY) - 80 // Arc height
        
        flyingShirt.style.position = 'fixed'
        flyingShirt.style.left = `${startX}px`
        flyingShirt.style.top = `${startY}px`
        flyingShirt.style.width = `${imageRect.width}px`
        flyingShirt.style.height = `${imageRect.height}px`
        flyingShirt.style.transform = 'translate(-50%, -50%) scale(1) rotate(0deg)'
        flyingShirt.style.opacity = '1'
        flyingShirt.style.zIndex = '10000'
        flyingShirt.style.pointerEvents = 'none'
        flyingShirt.style.transition = 'none'
        
        document.body.appendChild(flyingShirt)
        
        // Animate with keyframes for curved path
        const animationDuration = 1200 // 1.2 seconds - slower
        const startTime = performance.now()
        const arcHeight = 100 // Height of the arc
        
        function animate(currentTime) {
          const elapsed = currentTime - startTime
          const progress = Math.min(elapsed / animationDuration, 1)
          
          // Easing function for smooth animation
          const easeOutCubic = 1 - Math.pow(1 - progress, 3)
          
          // Calculate position along curved path (quadratic bezier curve)
          // P(t) = (1-t)²P₀ + 2(1-t)tP₁ + t²P₂
          const t = easeOutCubic
          const controlX = (startX + targetX) / 2
          const controlY = Math.min(startY, targetY) - arcHeight
          
          const x = (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * controlX + t * t * targetX
          const y = (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * controlY + t * t * targetY
          
          // Scale from 1 to 0.1
          const scale = 1 - (easeOutCubic * 0.9)
          
          // Rotate slightly as it moves (spinning effect)
          const rotation = easeOutCubic * 360
          
          // Opacity fade
          const opacity = 1 - (easeOutCubic * 0.9)
          
          flyingShirt.style.left = `${x}px`
          flyingShirt.style.top = `${y}px`
          flyingShirt.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${rotation}deg)`
          flyingShirt.style.opacity = opacity
          
          if (progress < 1) {
            requestAnimationFrame(animate)
          } else {
            flyingShirt.remove()
            addToBasket(productName, color, size)
            console.log('Added to basket:', { productName, color, size })
          }
        }
        
        requestAnimationFrame(animate)
      } else {
        // Fallback if positions can't be determined
        playTrashSound() // Play sound when item is added to basket
        addToBasket(productName, color, size)
        console.log('Added to basket:', { productName, color, size })
      }
    })
  })
}

// Product Detail Page
function showProductDetailPage(productId, productName, productImage, price, activeSection = 'softwear') {
  const softwearActive = activeSection === 'softwear' ? 'active' : ''
  const hardwearActive = activeSection === 'hardwear' ? 'active' : ''
  
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="shop-container">
            <!-- Top Navigation Bar -->
            <nav class="top-nav-bar">
              <div class="nav-btn nav-btn-left">Home</div>
              <div class="nav-btn nav-btn-left ${softwearActive}">softwear</div>
              <div class="nav-btn nav-btn-left ${hardwearActive}">hardwear</div>
              <div class="nav-btn nav-btn-right">basket</div>
            </nav>
            
            <!-- Product Detail Content -->
            <div class="shop-content">
              <div class="product-detail-content">
                <!-- Left: Product Image -->
                <div class="product-detail-image">
                  <img src="${productImage}" alt="${productName}" />
                </div>
                
                <!-- Right: Product Details -->
                <div class="product-detail-info ${productId.includes('nostalgia-flag') ? 'flag-product' : ''}">
                  <div class="product-detail-header">
                    <h1 class="product-detail-name">${productName}</h1>
                    <div class="product-detail-price-container">
                      <span class="product-detail-price crossed-out">${price}</span>
                      <span class="out-of-stock-label">out of stock</span>
                    </div>
                  </div>
                  
                  <div class="product-detail-divider"></div>
                  
                  <!-- Specs Section -->
                  <div class="product-detail-specs">
                    <div class="specs-header">
                      <span class="specs-title">specs</span>
                    </div>
                    <div class="product-detail-divider"></div>
                    <div class="specs-content">
                      ${productId.includes('marlboros') ? `
                        <div class="spec-item">
                          <span class="spec-label">Quantity:</span>
                          <span class="spec-value">20 cigarettes</span>
                        </div>
                      ` : productId.includes('nostalgia-flag') ? `
                        <div class="spec-item">
                          <span class="spec-label">Size:</span>
                          <span class="spec-value">3ft x 5ft</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Material:</span>
                          <span class="spec-value">Polyester</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Printed Sides:</span>
                          <span class="spec-value">Double Sided</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Grommets:</span>
                          <span class="spec-value">2 Side Grommets</span>
                        </div>
                      ` : productId.includes('essentials-01') ? `
                        <div class="spec-item">
                          <span class="spec-label">Material:</span>
                          <span class="spec-value">100% Cotton</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Fit:</span>
                          <span class="spec-value">Regular</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Accessible Dart & Lighter Pocket:</span>
                          <span class="spec-value">Yes</span>
                        </div>
                      ` : productId.includes('essentials-02') ? `
                        <div class="spec-item">
                          <span class="spec-label">Material:</span>
                          <span class="spec-value">100% Cotton Denim</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Fit:</span>
                          <span class="spec-value">Classic Baggy</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Care:</span>
                          <span class="spec-value">Machine Wash</span>
                        </div>
                      ` : productId.includes('essentials-03') ? `
                        <div class="spec-item">
                          <span class="spec-label">Material:</span>
                          <span class="spec-value">70% Cotton, 30% Polyester</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Fit:</span>
                          <span class="spec-value">Relaxed</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Weight:</span>
                          <span class="spec-value">400 GSM</span>
                        </div>
                    
                        
                      ` : `
                        <div class="spec-item">
                          <span class="spec-label">Material:</span>
                          <span class="spec-value">100% Cotton</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Fit:</span>
                          <span class="spec-value">Regular</span>
                        </div>
                        <div class="spec-item">
                          <span class="spec-label">Care:</span>
                          <span class="spec-value">Machine Wash</span>
                        </div>
                      `}
                    </div>
                  </div>
                  
                  <!-- Notify Me Button -->
                  <button class="notify-me-btn">Notify Me</button>
                </div>
              </div>
            </div>
            <!-- Date and Time Display -->
            <div class="date-time-display">${formatDateTime()}</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Start date/time updates
  startDateTimeUpdates()
  
  // Add navigation button click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const buttonText = this.textContent.trim().toLowerCase()
      
      // Update active state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      
      // Navigate based on button
      if (buttonText === 'softwear') {
        showSoftwearPage()
      } else if (buttonText === 'home') {
        showMainContent()
      } else if (buttonText === 'hardwear') {
        showHardwearPage()
      } else if (buttonText === 'basket') {
        showBasketPage()
      }
    })
  })
  
  // Specs content always visible
  const specsContent = document.querySelector('.specs-content')
  if (specsContent) {
    specsContent.style.display = 'block'
  }
  
  // Notify Me button handler
  const notifyBtn = document.querySelector('.notify-me-btn')
  if (notifyBtn) {
    notifyBtn.addEventListener('click', function() {
      showNotifyModal(productName)
    })
  }
}

// Show macOS-style notification modal
function showNotifyModal(productName) {
  // Remove any existing modal first
  const existingModal = document.querySelector('.mac-modal-inline')
  if (existingModal) {
    existingModal.remove()
  }
  
  // Create modal container (no overlay background, but positioned fixed)
  const modalContainer = document.createElement('div')
  modalContainer.className = 'mac-modal-inline'
  
  modalContainer.innerHTML = `
    <div class="mac-modal">
      <div class="mac-modal-title-bar">
        <div class="mac-traffic-lights">
          <div class="mac-traffic-light red" data-action="close"></div>
          <div class="mac-traffic-light yellow" data-action="minimize"></div>
          <div class="mac-traffic-light green" data-action="maximize"></div>
        </div>
        <h3 class="mac-modal-title">Notify Me</h3>
      </div>
      <div class="mac-modal-content">
        <p class="mac-modal-message">We'll notify you when "${productName}" is back in stock.</p>
        <form class="mac-modal-form" id="notify-form">
          <input 
            type="email" 
            class="mac-modal-input" 
            placeholder="Enter your email address" 
            id="notify-email"
            required
          />
          <div class="phone-input-wrapper">
            <select class="country-code-select" id="notify-country-code">
              <option value="+1">+1 (US/CA)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+33">+33 (FR)</option>
              <option value="+49">+49 (DE)</option>
              <option value="+46">+46 (SE)</option>
              <option value="+39">+39 (IT)</option>
              <option value="+52">+52 (MX)</option>
              <option value="+86">+86 (CN)</option>
            </select>
            <input 
              type="tel" 
              class="mac-modal-input phone-input" 
              placeholder="101-010-1010" 
              id="notify-phone"
              maxlength="12"
              required
            />
          </div>
          <div class="mac-modal-buttons">
            <button type="submit" class="mac-modal-btn primary">Notify Me</button>
          </div>
        </form>
      </div>
    </div>
  `
  
  // Insert modal into body (but without overlay background)
  document.body.appendChild(modalContainer)
  
  // Close modal handlers
  const closeModal = () => {
    modalContainer.remove()
  }
  
  // Red button (close)
  modalContainer.querySelector('.mac-traffic-light.red').addEventListener('click', closeModal)
  
  // Yellow button (minimize) - just close for now
  modalContainer.querySelector('.mac-traffic-light.yellow').addEventListener('click', closeModal)
  
  // Green button (maximize) - shows clicked state but does nothing
  const greenButton = modalContainer.querySelector('.mac-traffic-light.green')
  greenButton.addEventListener('click', function() {
    this.classList.add('clicked')
    // Remove clicked state after a short delay to show the visual feedback
    setTimeout(() => {
      this.classList.remove('clicked')
    }, 200)
  })
  
  // Phone number formatting
  const phoneInput = modalContainer.querySelector('#notify-phone')
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value.replace(/\D/g, '') // Remove all non-digits
      
      // Format: XXX-XXX-XXXX
      if (value.length > 6) {
        value = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10)
      } else if (value.length > 3) {
        value = value.slice(0, 3) + '-' + value.slice(3)
      }
      
      e.target.value = value
    })
    
    // Validate phone number on blur
    phoneInput.addEventListener('blur', function(e) {
      const value = e.target.value.replace(/\D/g, '')
      if (value.length > 0 && value.length !== 10) {
        e.target.style.borderColor = '#ff0000'
        e.target.setCustomValidity('Please enter a valid 10-digit phone number')
      } else {
        e.target.style.borderColor = ''
        e.target.setCustomValidity('')
      }
    })
  }
  
  // Form submission
  modalContainer.querySelector('#notify-form').addEventListener('submit', function(e) {
    e.preventDefault()
    const email = modalContainer.querySelector('#notify-email').value.trim()
    const phoneInput = modalContainer.querySelector('#notify-phone')
    const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : ''
    const countryCode = modalContainer.querySelector('#notify-country-code')?.value || '+1'
    
    // Require both email and phone
    if (!email) {
      alert('Please enter your email address.')
      modalContainer.querySelector('#notify-email').focus()
      return
    }
    
    if (!phone || phone.length !== 10) {
      alert('Please enter a valid 10-digit phone number.')
      if (phoneInput) phoneInput.focus()
      return
    }
    
    const contactInfo = email || (countryCode + ' ' + phoneInput.value)
    const contactType = email ? 'email' : 'phone'
    console.log('Notify request for:', productName, `${contactType}:`, contactInfo)
    // TODO: Send notification request to backend
    alert(`We'll notify you at ${contactInfo} when ${productName} is back in stock!`)
    closeModal()
  })
}

function showHardwearPage() {
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="shop-container">
            <!-- Top Navigation Bar -->
            <nav class="top-nav-bar">
              <div class="nav-btn nav-btn-left">Home</div>
              <div class="nav-btn nav-btn-left">softwear</div>
              <div class="nav-btn nav-btn-left active">hardwear</div>
              <div class="nav-btn nav-btn-right">basket</div>
            </nav>
            
            <!-- Hardwear Content Area -->
            <div class="shop-content">
              <div class="hardwear-content">
                <div class="products-grid">
                  <div class="product-item product-clickable" data-product="marlboros-01">
                    <div class="product-header">
                      <div class="product-name">MarlborOS</div>
                      <div class="product-price">$4.20</div>
                    </div>
                    <img src="/MarlborOS.svg" alt="MarlborOS" class="product-image" />
                  </div>
                  <div class="product-item product-clickable" data-product="nostalgia-flag-01">
                    <div class="product-header">
                      <div class="product-name">Nostalgia Flag</div>
                      <div class="product-price">$69</div>
                    </div>
                    <img src="/FinderUSAflag.svg" alt="Nostalgia Flag" class="product-image" />
                  </div>
                </div>
              </div>
            </div>
            <!-- Date and Time Display -->
            <div class="date-time-display">${formatDateTime()}</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Start date/time updates
  startDateTimeUpdates()
  
  // Add navigation button click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const buttonText = this.textContent.trim().toLowerCase()
      
      // Update active state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      
      // Navigate based on button
      if (buttonText === 'softwear') {
        showSoftwearPage()
      } else if (buttonText === 'home') {
        showMainContent()
      } else if (buttonText === 'hardwear') {
        showHardwearPage()
      } else if (buttonText === 'basket') {
        showBasketPage()
      }
    })
  })
  
  // Make product items clickable to go to product detail page
  document.querySelectorAll('.product-clickable').forEach(item => {
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking on selectors or buttons
      if (e.target.closest('.product-selectors') || e.target.closest('.add-to-cart-btn')) {
        return
      }
      
      const productId = this.getAttribute('data-product')
      const productName = this.querySelector('.product-name').textContent
      const productPrice = this.querySelector('.product-price').textContent
      
      if (productId === 'marlboros-01') {
        showProductDetailPage('marlboros-01', 'MarlborOS', '/MarlborOS.svg', productPrice, 'hardwear')
      } else if (productId === 'nostalgia-flag-01') {
        showProductDetailPage('nostalgia-flag-01', 'Nostalgia Flag', '/FinderUSAflag.svg', productPrice, 'hardwear')
      }
    })
  })
}

function showBasketPage() {
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="monitor-frame">
        <div class="monitor-logo">
          <img src="/applelogo.svg" alt="Apple Logo" />
        </div>
        <div class="monitor-screen">
          <div class="shop-container">
            <!-- Top Navigation Bar -->
            <nav class="top-nav-bar">
              <div class="nav-btn nav-btn-left">Home</div>
              <div class="nav-btn nav-btn-left">softwear</div>
              <div class="nav-btn nav-btn-left">hardwear</div>
              <div class="nav-btn nav-btn-right active">basket</div>
            </nav>
            
            <!-- Basket Content Area -->
            <div class="shop-content">
              <div class="basket-scrollbar-container">
                <div class="basket-content">
                  ${basket.length > 0 ? `<div class="basket-total">Total: $${getBasketTotal().toFixed(2)}</div>` : ''}
                <div class="basket-items">
                  ${basket.length > 0 
                    ? basket.map(item => `
                        <div class="basket-item">
                          <div class="basket-item-image">
                            <img src="/cigtshirt.svg" alt="${item.name}" />
                          </div>
                          <div class="basket-item-details">
                            <div class="basket-item-name">${item.name}</div>
                            <div class="basket-item-info">Color: ${item.color} | Size: ${item.size}</div>
                            <div class="basket-item-quantity">Qty: ${item.quantity}</div>
                          </div>
                          <button class="remove-item-btn" data-id="${item.id}">×</button>
                        </div>
                      `).join('')
                    : `
                      <div class="under-construction">
                        <div class="construction-logo">
                          <img src="/reversefindericon.svg" alt="Nostalgia OS" />
                        </div>
                        <h2 class="construction-title">Under Construction</h2>
                        <p class="construction-message">We're busy updating the basket for you. Please check back soon.</p>
                        <div class="construction-copyright">
                          Not Copyrighted © Nostalgia OS. No rights reserved
                        </div>
                      </div>
                    `
                  }
                </div>
                  ${basket.length > 0 ? '<button class="checkout-btn">Checkout</button>' : ''}
                </div>
              </div>
            </div>
            <!-- Date and Time Display -->
            <div class="date-time-display">${formatDateTime()}</div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Start date/time updates
  startDateTimeUpdates()
  
  // Add navigation button click handlers
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const buttonText = this.textContent.trim().toLowerCase()
      
      // Update active state
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'))
      this.classList.add('active')
      
      // Navigate based on button
      if (buttonText === 'softwear') {
        showSoftwearPage()
      } else if (buttonText === 'home') {
        showMainContent()
      } else if (buttonText === 'hardwear') {
        showHardwearPage()
      } else if (buttonText === 'basket') {
        showBasketPage()
      }
    })
  })
  
  // Remove item buttons
  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const itemId = parseInt(this.getAttribute('data-id'))
      playTrashSound() // Play trash sound when removing
      removeFromBasket(itemId)
      showBasketPage() // Refresh basket page
    })
  })
  
  // Checkout button
  const checkoutBtn = document.querySelector('.checkout-btn')
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', function() {
      console.log('Checkout clicked!')
      // Add checkout functionality here
    })
  }
  
}

// Initialize audio context on first user interaction
document.addEventListener('click', function initAudio() {
  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume()
  }
  // Remove listener after first interaction
  document.removeEventListener('click', initAudio)
}, { once: true })

// Start with boot screen
showBootScreen()
