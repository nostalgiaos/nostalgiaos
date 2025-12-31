import './style.css'
import { createSpinningModel } from './threeModelLoader.js'

// Helper function to reset viewport zoom on mobile (prevents zoom persistence across page navigations)
function resetViewportZoom() {
  if (window.innerWidth > 768) return // Only on mobile
  
  const viewport = document.querySelector('meta[name="viewport"]')
  if (!viewport) return
  
  // Get current content
  const currentContent = viewport.getAttribute('content')
  
  // Temporarily set to a different scale to force reset
  viewport.setAttribute('content', 'width=device-width, initial-scale=0.99')
  
  // Use requestAnimationFrame to ensure the change takes effect, then reset to normal
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      
      // After a brief moment, restore user scaling capability
      setTimeout(() => {
        viewport.setAttribute('content', 'width=device-width, initial-scale=1.0')
      }, 100)
    })
  })
}

// Helper function to convert img tags to inline SVGs on mobile (prevents iOS Safari rasterization)
async function convertImgToInlineSVG(imgElement) {
  if (!imgElement || imgElement.tagName !== 'IMG') return
  
  const src = imgElement.getAttribute('src')
  if (!src || !src.endsWith('.svg')) return
  
  try {
    const response = await fetch(src)
    const svgText = await response.text()
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml')
    const svgElement = svgDoc.querySelector('svg')
    
    if (svgElement) {
      // Get desired display size from img element
      const displayWidth = imgElement.getAttribute('width') || '250'
      const displayHeight = imgElement.getAttribute('height') || '250'
      
      // Get original viewBox from SVG (preserve it!)
      const originalViewBox = svgElement.getAttribute('viewBox')
      if (!originalViewBox && svgElement.getAttribute('width') && svgElement.getAttribute('height')) {
        // Create viewBox if it doesn't exist
        const origWidth = svgElement.getAttribute('width')
        const origHeight = svgElement.getAttribute('height')
        svgElement.setAttribute('viewBox', `0 0 ${origWidth} ${origHeight}`)
      }
      
      // Set explicit dimensions matching display size
      svgElement.setAttribute('width', displayWidth)
      svgElement.setAttribute('height', displayHeight)
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
      
      // Remove any existing width/height styles that might interfere
      svgElement.removeAttribute('style')
      
      // Set inline styles for proper rendering
      svgElement.style.cssText = `
        width: ${displayWidth}px !important;
        height: ${displayHeight}px !important;
        max-width: ${displayWidth}px !important;
        max-height: ${displayHeight}px !important;
        display: block;
        shape-rendering: geometricPrecision;
        text-rendering: geometricPrecision;
        image-rendering: auto;
      `
      
      // Ensure no transforms that could cause rasterization
      svgElement.style.transform = 'none'
      svgElement.style.webkitTransform = 'none'
      
      // Replace img with inline SVG
      imgElement.parentNode.replaceChild(svgElement, imgElement)
    }
  } catch (error) {
    console.error('Failed to convert SVG to inline:', error)
  }
}

// Convert all SVG img tags to inline SVGs on mobile
async function convertAllSVGImagesToInline() {
  if (window.innerWidth > 768) return // Only on mobile
  
  // Wait a bit for DOM to be ready
  await new Promise(resolve => setTimeout(resolve, 50))
  
  const svgImages = document.querySelectorAll('img[src$=".svg"]')
  if (svgImages.length === 0) return
  
  // Convert each image
  const promises = Array.from(svgImages).map(async (img) => {
    // Double-check it's still an img tag (not already converted)
    if (img.tagName === 'IMG' && img.src && img.src.endsWith('.svg')) {
      await convertImgToInlineSVG(img)
    }
  })
  
  await Promise.all(promises)
  
  // Verify conversion worked - if any img tags remain, try again
  const remainingImages = document.querySelectorAll('img[src$=".svg"]')
  if (remainingImages.length > 0) {
    console.log(`Still have ${remainingImages.length} SVG images to convert, retrying...`)
    setTimeout(() => {
      Array.from(remainingImages).forEach(img => convertImgToInlineSVG(img))
    }, 100)
  }
}

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
      <div class="boot-screen">
        <div class="boot-screen-svg-container"></div>
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
          // Progress bar complete - immediately show main site
          document.body.classList.add('booted')
          showMainContent()
        }
      }, 50)
    }
  }
}

function showMainContent() {
  // Reset viewport zoom on mobile (prevents zoom persistence)
  resetViewportZoom()
  
  // Prevent scroll restoration
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }
  
  // Check if mobile
  const isMobileView = window.innerWidth <= 768
  
  // Helper to wait for CSS to load (Vercel-specific issue)
  // On Vercel, CSS might load after JS, causing nav bar to not be positioned correctly initially
  const waitForCSS = (callback, maxWait = 500) => {
    const startTime = Date.now()
    const checkCSS = () => {
      // After HTML is rendered, check if nav bar CSS is applied
      const navBar = document.querySelector('.top-nav-bar')
      if (navBar) {
        const computed = window.getComputedStyle(navBar)
        // Check if the mobile-view CSS is applied (position should be fixed on mobile)
        if (isMobileView && computed.position === 'fixed') {
          callback()
          return
        }
      }
      
      // If timeout reached, proceed anyway
      if ((Date.now() - startTime) > maxWait) {
        callback()
        return
      }
      
      // Check again
      requestAnimationFrame(checkCSS)
    }
    // Start checking after HTML is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(checkCSS)
    })
  }
  
  // Add mobile class to body for CSS targeting
  if (isMobileView) {
    document.body.classList.add('mobile-view')
    // IMMEDIATELY lock scroll BEFORE any rendering
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.style.scrollTop = '0'
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.position = 'fixed'
      document.documentElement.style.width = '100%'
      document.documentElement.style.top = '0'
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
      document.body.style.top = '0'
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
    }
  } else {
    document.body.classList.remove('mobile-view')
  }
  
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
      <div class="shop-container home-page-container">
        <!-- Top Navigation Bar -->
        <nav class="top-nav-bar">
          <div class="nav-btn nav-btn-left active">Home</div>
          <div class="nav-btn nav-btn-left">softwear</div>
          <div class="nav-btn nav-btn-left">hardwear</div>
          <div class="nav-btn nav-btn-right">basket</div>
        </nav>
        
        <!-- Page Title -->
        <h1 class="page-title">Nostalgia <span class="page-title-os">OS</span></h1>
        
        <!-- Products directly in shop-container -->
        <!-- Softwear Products -->
        <div class="product-showcase-item product-clickable" data-product="essentials-01" data-section="softwear">
          <div class="product-showcase-image">
            <img src="/cigtshirt.svg" alt="The Essentials" width="250" height="250" />
          </div>
          <div class="product-showcase-info">
            <h3 class="product-showcase-name">the essentials</h3>
            <p class="product-showcase-price">$69</p>
          </div>
        </div>
        
        <div class="product-showcase-item product-clickable" data-product="essentials-02" data-section="softwear">
          <div class="product-showcase-image">
            <img src="/jeans1.svg" alt="Jeans" width="250" height="250" />
          </div>
          <div class="product-showcase-info">
            <h3 class="product-showcase-name">jeans</h3>
            <p class="product-showcase-price">$99</p>
          </div>
        </div>
        
        <div class="product-showcase-item product-clickable" data-product="essentials-03" data-section="softwear">
          <div class="product-showcase-image">
            <img src="/finderhoodie.svg" alt="Hoodie" width="250" height="250" />
          </div>
          <div class="product-showcase-info">
            <h3 class="product-showcase-name">hoodie</h3>
            <p class="product-showcase-price">$101</p>
          </div>
        </div>
        
        <!-- Hardwear Products -->
        <div class="product-showcase-item product-clickable marlboros-item" data-product="marlboros-01" data-section="hardwear">
          <div class="product-showcase-image">
            <img src="/MarlborOS.svg" alt="MarlborOS" width="180" height="180" />
          </div>
          <div class="product-showcase-info">
            <h3 class="product-showcase-name">marlboros</h3>
            <p class="product-showcase-price">$6.80</p>
          </div>
        </div>
        
        <div class="product-showcase-item product-clickable" data-product="nostalgia-flag-01" data-section="hardwear">
          <div class="product-showcase-image">
            <img src="/FinderUSAflag.svg" alt="Nostalgia Flag" width="250" height="250" />
          </div>
          <div class="product-showcase-info">
            <h3 class="product-showcase-name">nostalgia flag</h3>
            <p class="product-showcase-price">$68</p>
          </div>
        </div>
        
        <!-- Notify Section -->
        <div class="homepage-notify-section">
          <p class="homepage-notify-text">get notified when new items arrive</p>
          <a href="#" class="homepage-notify-link" id="homepage-notify-link" onclick="window.showNotifyModalForProduct('new items'); return false;">notify me</a>
        </div>
        
        <!-- Legal / System Block -->
        <div class="legal-system-block">
          <div class="legal-system-content">
            <div class="legal-divider-line"></div>
            <div class="legal-footer-row">
              <div class="legal-copyright">Not Copyrighted © 2025 NostalgiaOS. No rights reserved.</div>
              <div class="legal-links">
                <a href="#" class="legal-link" id="footer-readme-link">README</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // MOBILE: Wait for CSS to load on Vercel, then proceed with scroll locking
  if (isMobileView) {
    waitForCSS(() => {
      proceedWithScrollLock()
    })
  } else {
    proceedWithScrollLock()
  }
  
  function proceedWithScrollLock() {
    // MOBILE: Ensure scroll is at top before unlocking overflow
    if (isMobileView) {
    // Wait for content to render, then ensure scroll is at top
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Force scroll to top multiple times while overflow is still hidden
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        window.scrollTo(0, 0)
        if (document.documentElement) {
          document.documentElement.scrollTop = 0
          document.documentElement.scrollTo(0, 0)
        }
        if (document.body) {
          document.body.scrollTop = 0
          document.body.scrollTo(0, 0)
        }
        if (document.scrollingElement) {
          document.scrollingElement.scrollTop = 0
          document.scrollingElement.scrollTo(0, 0)
        }
        
        // Wait a bit more, then unlock overflow
        setTimeout(() => {
          // Final scroll check before unlocking - ensure we're at 0
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
          window.scrollTo(0, 0)
          if (document.documentElement) {
            document.documentElement.scrollTop = 0
          }
          if (document.body) {
            document.body.scrollTop = 0
          }
          
          // Now unlock overflow and enable scrolling
          document.documentElement.style.position = 'static'
          document.documentElement.style.width = 'auto'
          document.documentElement.style.top = 'auto'
          document.documentElement.style.overflow = 'auto'
          document.body.style.position = 'relative'
          document.body.style.width = 'auto'
          document.body.style.top = 'auto'
          document.body.style.overflow = 'auto'
          
          // Immediately after unlocking, force scroll to top again
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
            window.scrollTo(0, 0)
            if (document.documentElement) {
              document.documentElement.scrollTop = 0
            }
            if (document.body) {
              document.body.scrollTop = 0
            }
          })
          
          // Monitor and correct scroll position for 1 second after unlocking
          let scrollCheckCount = 0
          const maxScrollChecks = 20 // Check 20 times over 1 second
          const scrollMonitor = setInterval(() => {
            scrollCheckCount++
            if (scrollCheckCount >= maxScrollChecks) {
              clearInterval(scrollMonitor)
              return
            }
            
            // Check if scroll has moved from top
            const currentScroll = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
            if (currentScroll > 0) {
              // Force back to top
              window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
              window.scrollTo(0, 0)
              if (document.documentElement) {
                document.documentElement.scrollTop = 0
              }
              if (document.body) {
                document.body.scrollTop = 0
              }
            }
          }, 50) // Check every 50ms
        }, 200)
      })
    })
  } else {
    // Desktop: smooth scrolling
    if (document.body) {
      document.body.style.overflow = 'auto'
      document.body.style.position = 'relative'
      document.body.style.top = 'auto'
    }
    if (document.documentElement) {
      document.documentElement.style.overflow = 'auto'
      document.documentElement.style.scrollBehavior = 'smooth'
    }
  }
  
  // AGGRESSIVE scroll to top for mobile - run multiple times to ensure it sticks
  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.scrollTo(0, 0)
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollTo(0, 0)
    }
  }
  
  if (isMobileView) {
    // Run immediately and multiple times - MORE AGGRESSIVE
    scrollToTop()
    requestAnimationFrame(scrollToTop)
    setTimeout(scrollToTop, 0)
    setTimeout(scrollToTop, 10)
    setTimeout(scrollToTop, 50)
    setTimeout(scrollToTop, 100)
    setTimeout(scrollToTop, 200)
    setTimeout(scrollToTop, 500)
    setTimeout(scrollToTop, 1000)
    
    // Also run when page becomes visible (handles tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        scrollToTop()
      }
    })
    
    // Run on page focus
    window.addEventListener('focus', scrollToTop)
  }
  
  } // Close proceedWithScrollLock function
  
  // Listen for resize to scroll to top when switching to mobile
  let lastWidth = window.innerWidth
  let resizeTimeout
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout)
    resizeTimeout = setTimeout(() => {
      const currentWidth = window.innerWidth
      // If switching from desktop (>768) to mobile (<=768), scroll to top
      if (lastWidth > 768 && currentWidth <= 768) {
        scrollToTop()
        setTimeout(scrollToTop, 50)
        setTimeout(scrollToTop, 100)
        setTimeout(scrollToTop, 200)
      }
      lastWidth = currentWidth
    }, 50)
  })

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

  // Footer README link handler
  const footerReadmeLink = document.getElementById('footer-readme-link')
  if (footerReadmeLink) {
    footerReadmeLink.addEventListener('click', function(e) {
      e.preventDefault()
      showReadmeModal()
    })
  }

  // Homepage notify link handler
  const attachHomepageNotifyHandler = () => {
    const homepageNotifyLink = document.getElementById('homepage-notify-link')
    if (homepageNotifyLink) {
      // Clone to remove existing listeners
      const newLink = homepageNotifyLink.cloneNode(true)
      homepageNotifyLink.parentNode.replaceChild(newLink, homepageNotifyLink)
      
      newLink.addEventListener('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        console.log('Homepage notify link clicked')
        if (typeof showNotifyModal === 'function') {
          showNotifyModal('new items')
        } else {
          console.error('showNotifyModal is not a function')
        }
      })
      console.log('Homepage notify link handler attached')
    } else {
      console.error('Homepage notify link not found')
    }
  }
  
  attachHomepageNotifyHandler()
  setTimeout(attachHomepageNotifyHandler, 50)
  setTimeout(attachHomepageNotifyHandler, 200)

  // Make homepage product items clickable to go to product detail page
  document.querySelectorAll('.product-clickable').forEach(item => {
    item.addEventListener('click', function(e) {
      // Don't trigger if clicking on selectors or buttons
      if (e.target.closest('.product-selectors') || e.target.closest('.add-to-cart-btn')) {
        return
      }
      
      const productId = this.getAttribute('data-product')
      const section = this.getAttribute('data-section')
      const productName = this.querySelector('.product-showcase-name')?.textContent
      const productPrice = this.querySelector('.product-showcase-price')?.textContent
      
      if (productId === 'essentials-01') {
        showProductDetailPage('essentials-01', 'the essentials', '/cigtshirt.svg', productPrice || '$69', section || 'softwear')
      } else if (productId === 'essentials-02') {
        showProductDetailPage('essentials-02', 'jeans', '/jeans1.svg', productPrice || '$99', section || 'softwear')
      } else if (productId === 'essentials-03') {
        showProductDetailPage('essentials-03', 'hoodie', '/finderhoodie.svg', productPrice || '$101', section || 'softwear')
      } else if (productId === 'marlboros-01') {
        showProductDetailPage('marlboros-01', 'marlboros', '/MarlborOS.svg', productPrice || '$6.80', section || 'hardwear')
      } else if (productId === 'nostalgia-flag-01') {
        showProductDetailPage('nostalgia-flag-01', 'nostalgia flag', '/FinderUSAflag.svg', productPrice || '$68', section || 'hardwear')
      }
    })
  })
  
  // Convert SVG images to inline on mobile (prevents iOS Safari rasterization)
  if (window.innerWidth <= 768) {
    // Try multiple times to ensure conversion happens
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 50)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 200)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 500)
  }
}

function showSoftwearPage() {
  // Reset viewport zoom on mobile (prevents zoom persistence)
  resetViewportZoom()
  
  // Force scroll to top before rendering
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  window.scrollTo(0, 0)
  if (document.documentElement) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollTo(0, 0)
  }
  if (document.body) {
    document.body.scrollTop = 0
    document.body.scrollTo(0, 0)
  }
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollTo(0, 0)
  }
  
  // Check if mobile and add mobile-view class
  const isMobileView = window.innerWidth <= 768
  if (isMobileView) {
    document.body.classList.add('mobile-view')
  } else {
    document.body.classList.remove('mobile-view')
  }
  
  // Disable smooth scrolling for other pages
  document.documentElement.style.scrollBehavior = 'auto'
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
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
              <h1 class="page-title">softwear</h1>
              <div class="softwear-content">
                <div class="products-grid">
                  <div class="product-showcase-item product-clickable" data-product="essentials-01" data-section="softwear">
                    <div class="product-showcase-image">
                      <img src="/cigtshirt.svg" alt="The Essentials" width="250" height="250" />
                    </div>
                    <div class="product-showcase-info">
                      <h3 class="product-showcase-name">the essentials</h3>
                      <p class="product-showcase-price">$69</p>
                    </div>
                  </div>
                  <div class="product-showcase-item product-clickable" data-product="essentials-02" data-section="softwear">
                    <div class="product-showcase-image">
                      <img src="/jeans1.svg" alt="Jeans" width="250" height="250" />
                    </div>
                    <div class="product-showcase-info">
                      <h3 class="product-showcase-name">jeans</h3>
                      <p class="product-showcase-price">$99</p>
                    </div>
                  </div>
                  <div class="product-showcase-item product-clickable" data-product="essentials-03" data-section="softwear">
                    <div class="product-showcase-image">
                      <img src="/finderhoodie.svg" alt="Hoodie" width="250" height="250" />
                    </div>
                    <div class="product-showcase-info">
                      <h3 class="product-showcase-name">hoodie</h3>
                      <p class="product-showcase-price">$101</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Force scroll to top after rendering
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.scrollTo(0, 0)
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollTo(0, 0)
    }
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
      } else if (buttonText === 'readme') {
        showReadmeModal()
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
      const section = this.getAttribute('data-section')
      const productName = this.querySelector('.product-name')?.textContent || this.querySelector('.product-showcase-name')?.textContent
      const productPrice = this.querySelector('.product-price')?.textContent || this.querySelector('.product-showcase-price')?.textContent
      
      if (productId === 'essentials-01') {
        showProductDetailPage('essentials-01', 'the essentials', '/cigtshirt.svg', productPrice, 'softwear')
      } else if (productId === 'essentials-02') {
        showProductDetailPage('essentials-02', 'jeans', '/jeans1.svg', productPrice, 'softwear')
      } else if (productId === 'essentials-03') {
        showProductDetailPage('essentials-03', 'hoodie', '/finderhoodie.svg', productPrice, 'softwear')
      } else if (productId === 'marlboros-01') {
        showProductDetailPage('marlboros-01', 'marlboros', '/MarlborOS.svg', productPrice, 'hardwear')
      } else if (productId === 'nostalgia-flag-01') {
        showProductDetailPage('nostalgia-flag-01', 'nostalgia flag', '/FinderUSAflag.svg', productPrice, 'hardwear')
      }
      
      // Handle homepage showcase products
      if (productId && productName && productPrice) {
        // Product detail page will be shown by the conditions above
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
  
  // Convert SVG images to inline on mobile (prevents iOS Safari rasterization)
  if (window.innerWidth <= 768) {
    // Try multiple times to ensure conversion happens
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 50)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 200)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 500)
  }
}

// Make showNotifyModal globally accessible (define before it's used in HTML)
if (typeof window.showNotifyModalForProduct === 'undefined') {
  window.showNotifyModalForProduct = function(productName) {
    // showNotifyModal will be defined later, but we'll call it when needed
    if (typeof showNotifyModal === 'function') {
      showNotifyModal(productName)
    } else {
      // Fallback: wait for function to be defined
      setTimeout(() => {
        if (typeof showNotifyModal === 'function') {
          showNotifyModal(productName)
        } else {
          console.error('showNotifyModal function not found')
        }
      }, 100)
    }
  }
}

// Product Detail Page
function showProductDetailPage(productId, productName, productImage, price, activeSection = 'softwear') {
  // Reset viewport zoom on mobile (prevents zoom persistence)
  resetViewportZoom()
  
  // Force scroll to top before rendering
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  window.scrollTo(0, 0)
  if (document.documentElement) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollTo(0, 0)
  }
  if (document.body) {
    document.body.scrollTop = 0
    document.body.scrollTo(0, 0)
  }
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollTo(0, 0)
  }
  
  // Disable smooth scrolling for other pages
  document.documentElement.style.scrollBehavior = 'auto'
  const softwearActive = activeSection === 'softwear' ? 'active' : ''
  const hardwearActive = activeSection === 'hardwear' ? 'active' : ''
  
  // Determine width/height based on product image - use display size for mobile to prevent rasterization
  // On mobile, we use 280px to match CSS. Desktop will scale appropriately.
  let imgWidth = '280'
  let imgHeight = '280'
  if (productImage.includes('MarlborOS.svg')) {
    // MarlborOS is smaller, use proportional size
    imgWidth = '200'
    imgHeight = '200'
  }
  
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
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
                <div class="product-detail-image" data-product-image="${productImage}">
                  <img src="${productImage}" alt="${productName}" width="${imgWidth}" height="${imgHeight}" />
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
                    <div class="specs-header" id="specs-header-toggle">
                      <span class="specs-title">specs</span>
                      <span class="specs-toggle-icon" id="specs-toggle-icon">+</span>
                    </div>
                    <div class="product-detail-divider"></div>
                    <div class="specs-content" id="specs-content">
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
                  <button class="notify-me-btn" onclick="window.showNotifyModalForProduct('${productName}')">Notify Me</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Force scroll to top after rendering
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.scrollTo(0, 0)
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollTo(0, 0)
    }
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
      } else if (buttonText === 'readme') {
        showReadmeModal()
      }
    })
  })
  
  // Specs toggle functionality for mobile
  const specsHeader = document.getElementById('specs-header-toggle')
  const specsContent = document.getElementById('specs-content')
  const specsToggleIcon = document.getElementById('specs-toggle-icon')
  
  if (specsHeader && specsContent && specsToggleIcon) {
    // Check if mobile
    const isMobileView = window.innerWidth <= 768
    if (isMobileView) {
      // Hide specs by default on mobile
      specsContent.classList.remove('specs-visible')
      specsContent.style.display = 'none'
      specsToggleIcon.textContent = '+'
    } else {
      // Show specs by default on desktop
      specsContent.classList.add('specs-visible')
      specsContent.style.display = 'block'
      specsToggleIcon.textContent = '−'
    }
    
    // Toggle specs on click
    specsHeader.addEventListener('click', function(e) {
      e.preventDefault()
      e.stopPropagation()
      const isVisible = specsContent.classList.contains('specs-visible')
      if (isVisible) {
        specsContent.classList.remove('specs-visible')
        specsContent.style.display = 'none'
        specsToggleIcon.textContent = '+'
      } else {
        specsContent.classList.add('specs-visible')
        specsContent.style.display = 'block'
        specsToggleIcon.textContent = '−'
      }
    })
  } else if (specsContent) {
    // Fallback: show specs on desktop if IDs not found
    const isMobileView = window.innerWidth <= 768
    if (!isMobileView) {
      specsContent.style.display = 'block'
    }
  }
  
  // Convert SVG images to inline on mobile (prevents iOS Safari rasterization)
  if (window.innerWidth <= 768) {
    // Try multiple times to ensure conversion happens
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 50)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 200)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 500)
  }
  
  // Notify Me button handler - use multiple approaches to ensure it works
  const attachNotifyHandler = () => {
    const notifyBtn = document.querySelector('.notify-me-btn')
    if (notifyBtn) {
      // Remove any existing listeners by cloning
      const newNotifyBtn = notifyBtn.cloneNode(true)
      notifyBtn.parentNode.replaceChild(newNotifyBtn, notifyBtn)
      
      // Add click handler with explicit function reference
      newNotifyBtn.addEventListener('click', function(e) {
        e.preventDefault()
        e.stopPropagation()
        console.log('Notify Me button clicked, productName:', productName)
        if (typeof showNotifyModal === 'function') {
          showNotifyModal(productName)
        } else {
          console.error('showNotifyModal is not a function')
        }
      })
      console.log('Notify Me button handler attached')
    } else {
      console.error('Notify Me button not found')
    }
  }
  
  // Try immediately
  attachNotifyHandler()
  
  // Also try after a delay
  setTimeout(attachNotifyHandler, 50)
  setTimeout(attachNotifyHandler, 200)
}

// Show success modal (styled to match site aesthetic)
function showSuccessModal(title, message, onClose) {
  // Remove any existing modals first
  const existingModal = document.querySelector('.mac-modal-inline')
  if (existingModal) {
    existingModal.remove()
  }
  
  // Create modal container
  const modalContainer = document.createElement('div')
  modalContainer.className = 'mac-modal-inline'
  
  modalContainer.innerHTML = `
    <div class="success-modal mac-modal">
      <div class="mac-modal-title-bar">
        <div class="mac-traffic-lights">
          <div class="mac-traffic-light red" data-action="close"></div>
          <div class="mac-traffic-light yellow" data-action="minimize"></div>
          <div class="mac-traffic-light green" data-action="maximize"></div>
        </div>
        <h3 class="mac-modal-title">${title}</h3>
      </div>
      <div class="mac-modal-content">
        <p class="mac-modal-message">${message}</p>
        <div class="mac-modal-buttons">
          <button class="mac-modal-btn primary">OK</button>
        </div>
      </div>
    </div>
  `
  
  // Insert modal into body
  document.body.appendChild(modalContainer)
  
  // Close modal function
  const closeModal = () => {
    modalContainer.style.opacity = '0'
    modalContainer.style.transition = 'opacity 0.2s ease'
    setTimeout(() => {
      modalContainer.remove()
      if (onClose) onClose()
    }, 200)
  }
  
  // Close handlers
  modalContainer.querySelector('.mac-traffic-light.red').addEventListener('click', closeModal)
  modalContainer.querySelector('.mac-traffic-light.yellow').addEventListener('click', closeModal)
  modalContainer.querySelector('.mac-modal-btn').addEventListener('click', closeModal)
  
  // Green button (maximize) - shows clicked state
  const greenButton = modalContainer.querySelector('.mac-traffic-light.green')
  greenButton.addEventListener('click', function() {
    this.classList.add('clicked')
    setTimeout(() => {
      this.classList.remove('clicked')
    }, 200)
  })
  
  // Close on ESC key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      closeModal()
      document.removeEventListener('keydown', handleEscape)
    }
  }
  document.addEventListener('keydown', handleEscape)
  
  // Animate in
  requestAnimationFrame(() => {
    modalContainer.style.opacity = '1'
  })
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
              placeholder="101-010-1010 (optional)" 
              id="notify-phone"
              maxlength="12"
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
  modalContainer.querySelector('#notify-form').addEventListener('submit', async function(e) {
    e.preventDefault()
    const email = modalContainer.querySelector('#notify-email').value.trim()
    const phoneInput = modalContainer.querySelector('#notify-phone')
    const phoneRaw = phoneInput ? phoneInput.value.replace(/\D/g, '') : ''
    const countryCode = modalContainer.querySelector('#notify-country-code')?.value || '+1'
    
    // Require email
    if (!email) {
      alert('Please enter your email address.')
      modalContainer.querySelector('#notify-email').focus()
      return
    }
    
    // Format phone number (optional)
    // If phone is provided, validate it's 10 digits and format with country code
    let formattedPhone = null
    if (phoneRaw && phoneRaw.length === 10) {
      formattedPhone = countryCode + ' ' + phoneInput.value
    } else if (phoneRaw && phoneRaw.length > 0) {
      alert('Please enter a valid 10-digit phone number, or leave it blank.')
      if (phoneInput) phoneInput.focus()
      return
    }
    
    // Show loading state
    const submitButton = modalContainer.querySelector('button[type="submit"]')
    const originalButtonText = submitButton.textContent
    submitButton.textContent = 'Adding you to the list…'
    submitButton.disabled = true
    
    // Check if Supabase client is available
    if (!window.supabaseClient) {
      alert('Error: Supabase client not initialized. Please check your configuration.')
      submitButton.textContent = originalButtonText
      submitButton.disabled = false
      return
    }
    
    // Insert into Supabase
    try {
      const { data, error } = await window.supabaseClient
        .from('waitlist')
        .insert([{ 
          email, 
          phone: formattedPhone,
          product_name: productName
        }])
      
      if (error) {
        // Handle duplicate email (unique constraint violation)
        if (error.code === '23505') {
          showSuccessModal('Already on the list', 'You\'re already on the list! We\'ll notify you when it\'s back in stock.', closeModal)
        } else if (error.code === '42P01') {
          // Table doesn't exist
          showSuccessModal('Error', 'The waitlist table doesn\'t exist. Please contact support.', () => {
            console.error('Supabase error:', error)
          })
        } else if (error.message && error.message.includes('JWT')) {
          // Invalid anon key
          showSuccessModal('Error', 'Invalid Supabase configuration. Please contact support.', () => {
            console.error('Supabase error:', error)
          })
        } else {
          // Other errors
          showSuccessModal('Error', error.message || 'Something went wrong. Please try again.', () => {
            console.error('Supabase error:', error)
          })
        }
      } else {
        // Success message
        const phoneMessage = formattedPhone ? ` and ${formattedPhone}` : ''
        const successMessage = `We'll notify you at ${email}${phoneMessage} when ${productName} is back in stock!`
        showSuccessModal('You\'re on the list!', successMessage, closeModal)
      }
    } catch (error) {
      console.error('Error submitting notification:', error)
      showSuccessModal('Error', error.message || 'Something went wrong. Please check the browser console for details.', () => {})
    } finally {
      // Restore button state
      if (submitButton) {
        submitButton.textContent = originalButtonText
        submitButton.disabled = false
      }
    }
  })
}

function showHardwearPage() {
  // Reset viewport zoom on mobile (prevents zoom persistence)
  resetViewportZoom()
  
  // Force scroll to top before rendering
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  window.scrollTo(0, 0)
  if (document.documentElement) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollTo(0, 0)
  }
  if (document.body) {
    document.body.scrollTop = 0
    document.body.scrollTo(0, 0)
  }
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollTo(0, 0)
  }
  
  // Check if mobile and add mobile-view class
  const isMobileView = window.innerWidth <= 768
  if (isMobileView) {
    document.body.classList.add('mobile-view')
  } else {
    document.body.classList.remove('mobile-view')
  }
  
  // Disable smooth scrolling for other pages
  document.documentElement.style.scrollBehavior = 'auto'
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
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
              <h1 class="page-title">hardwear</h1>
              <div class="hardwear-content">
                <div class="products-grid">
                  <div class="product-showcase-item product-clickable marlboros-item" data-product="marlboros-01" data-section="hardwear">
                    <div class="product-showcase-image">
                      <img src="/MarlborOS.svg" alt="MarlborOS" width="180" height="180" />
                    </div>
                    <div class="product-showcase-info">
                      <h3 class="product-showcase-name">marlboros</h3>
                      <p class="product-showcase-price">$6.80</p>
                    </div>
                  </div>
                  <div class="product-showcase-item product-clickable" data-product="nostalgia-flag-01" data-section="hardwear">
                    <div class="product-showcase-image">
                      <img src="/FinderUSAflag.svg" alt="Nostalgia Flag" width="250" height="250" />
                    </div>
                    <div class="product-showcase-info">
                      <h3 class="product-showcase-name">nostalgia flag</h3>
                      <p class="product-showcase-price">$68</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
  
  // Force scroll to top after rendering
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.scrollTo(0, 0)
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollTo(0, 0)
    }
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
      } else if (buttonText === 'readme') {
        showReadmeModal()
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
      const section = this.getAttribute('data-section')
      const productName = this.querySelector('.product-showcase-name')?.textContent
      const productPrice = this.querySelector('.product-showcase-price')?.textContent
      
      if (productId === 'marlboros-01') {
        showProductDetailPage('marlboros-01', 'marlboros', '/MarlborOS.svg', productPrice || '$6.80', section || 'hardwear')
      } else if (productId === 'nostalgia-flag-01') {
        showProductDetailPage('nostalgia-flag-01', 'nostalgia flag', '/FinderUSAflag.svg', productPrice || '$68', section || 'hardwear')
      }
    })
  })
  
  // Convert SVG images to inline on mobile (prevents iOS Safari rasterization)
  if (window.innerWidth <= 768) {
    // Try multiple times to ensure conversion happens
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 50)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 200)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 500)
  }
}

// Show README modal overlay
function showReadmeModal() {
  // Remove any existing modal first
  const existingModal = document.querySelector('.readme-modal-overlay')
  if (existingModal) {
    existingModal.remove()
  }
  
  // Create full-screen modal overlay
  const modalOverlay = document.createElement('div')
  modalOverlay.className = 'readme-modal-overlay'
  modalOverlay.setAttribute('role', 'dialog')
  modalOverlay.setAttribute('aria-modal', 'true')
  modalOverlay.setAttribute('aria-label', 'System Info')
  
  modalOverlay.innerHTML = `
    <div class="readme-modal-container">
      <div class="terminal-window readme-terminal">
        <div class="terminal-header">
          <div class="terminal-header-dots">
            <button class="terminal-dot terminal-dot-red" aria-label="Close" tabindex="0">
              <img src="/redbutton.svg" alt="" class="terminal-dot-icon" />
              <img src="/redbuttonhover.svg" alt="" class="terminal-dot-icon terminal-dot-icon-hover" />
            </button>
            <button class="terminal-dot terminal-dot-yellow" aria-label="Minimize" tabindex="0">
              <img src="/yellowbutton.svg" alt="" class="terminal-dot-icon" />
              <img src="/yellowbuttonhover.svg" alt="" class="terminal-dot-icon terminal-dot-icon-hover" />
            </button>
            <button class="terminal-dot terminal-dot-green" aria-label="Maximize" tabindex="0">
              <img src="/greenbutton.svg" alt="" class="terminal-dot-icon" />
              <img src="/greenbuttonhover.svg" alt="" class="terminal-dot-icon terminal-dot-icon-hover" />
            </button>
          </div>
          <div class="terminal-header-text">SYSTEM INFO — NostalgiaOS</div>
        </div>
        <div class="terminal-screen" id="terminal-screen">
          <div class="terminal-content" id="terminal-content"></div>
          <span class="terminal-cursor" id="terminal-cursor">█</span>
        </div>
      </div>
    </div>
  `
  
  document.body.appendChild(modalOverlay)
  
  // Focus trap - get all focusable elements (the 3 dot buttons)
  const focusableElements = modalOverlay.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )
  const firstFocusable = focusableElements[0] // Red dot (close)
  const lastFocusable = focusableElements[focusableElements.length - 1] // Green dot
  
  // Handle ESC key
  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeReadmeModal()
    }
  }
  
  // Handle Enter key to close modal (desktop)
  function handleEnter(e) {
    if (e.key === 'Enter' && window.innerWidth > 768) {
      closeReadmeModal()
    }
  }
  
  // Handle Tab key for focus trap
  function handleTab(e) {
    if (e.key !== 'Tab') return
    
    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable.focus()
      }
    } else {
      // Tab
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable.focus()
      }
    }
  }
  
  // Close modal function
  function closeReadmeModal() {
    modalOverlay.remove()
    document.removeEventListener('keydown', handleEscape)
    document.removeEventListener('keydown', handleEnter)
    document.removeEventListener('keydown', handleTab)
    // Restore body scroll
    document.body.style.overflow = 'auto'
  }
  
  // Add event listeners
  document.addEventListener('keydown', handleEscape)
  document.addEventListener('keydown', handleEnter)
  document.addEventListener('keydown', handleTab)
  
  // Red dot (close) button handler
  const closeBtn = modalOverlay.querySelector('.terminal-dot-red')
  if (closeBtn) {
    closeBtn.addEventListener('click', closeReadmeModal)
  }
  
  // Yellow and green dots (no action for now, but can be added later)
  const yellowBtn = modalOverlay.querySelector('.terminal-dot-yellow')
  const greenBtn = modalOverlay.querySelector('.terminal-dot-green')
  
  // Close on overlay click (outside terminal)
  modalOverlay.addEventListener('click', function(e) {
    const terminalWindow = modalOverlay.querySelector('.readme-terminal')
    // Close if clicking outside the terminal window
    if (terminalWindow && !terminalWindow.contains(e.target)) {
      closeReadmeModal()
    }
  })
  
  // Prevent body scroll when modal is open
  document.body.style.overflow = 'hidden'
  
  // Focus first element for accessibility
  setTimeout(() => {
    if (firstFocusable) {
      firstFocusable.focus()
    }
  }, 100)
  
  // Start terminal animation
  startTerminalAnimation()
}

// Terminal animation for System Info page
function startTerminalAnimation() {
  const terminalContent = document.getElementById('terminal-content')
  const terminalCursor = document.getElementById('terminal-cursor')
  
  if (!terminalContent) return
  
  // Reset content for replay
  terminalContent.innerHTML = ''
  if (terminalCursor) {
    terminalCursor.style.display = 'inline-block'
  }
  
  const lines = [
    'NostalgiaOS Terminal v1.0',
    '(c) 2025 NostalgiaOS',
    'All memory preserved.',
    '',
    'Initializing system...',
    '',
    { type: 'header', text: 'SYSTEM OVERVIEW' },
    { type: 'body', text: 'NostalgiaOS is a physical operating system' },
    { type: 'body', text: 'inspired by early personal computing,' },
    { type: 'body', text: 'offline culture, and intentional design.' },
    '',
    { type: 'header', text: 'SPECIFICATIONS' },
    { type: 'body', text: 'PLATFORM: Physical Apparel & Objects' },
    { type: 'body', text: 'INTERFACE: Tactile / Human' },
    { type: 'body', text: 'RELEASE MODEL: Limited Drops' },
    { type: 'body', text: 'LATENCY: Immediate' },
    { type: 'body', text: 'COMPATIBILITY: Humans' },
    { type: 'body', text: 'ERROR HANDLING: Imperfection Accepted' },
    '',
    { type: 'header', text: 'OPERATING PRINCIPLES' },
    { type: 'body', text: '- Memory over metrics' },
    { type: 'body', text: '- Physical before digital' },
    { type: 'body', text: '- Design before scale' },
    { type: 'body', text: '- Nostalgia is a feature' },
    '',
    { type: 'header', text: 'ORIGIN' },
    { type: 'body', text: 'FIRST COMPILED: 2025' },
    { type: 'body', text: 'ENVIRONMENT: Internet + Childhood' },
    '',
    { type: 'header', text: 'STATUS' },
    { type: 'body', text: 'SYSTEM STATUS: ACTIVE' },
    { type: 'body', text: 'LAST UPDATE: ONGOING' },
    '',
    '>',
    '',
    { type: 'body', text: 'Press Enter to go back', className: 'exit-instruction exit-instruction-desktop' },
    { type: 'body', text: 'Tap outside or press ESC to close', className: 'exit-instruction exit-instruction-mobile' }
  ]
  
  let lineIndex = 0
  let charIndex = 0
  let displayedText = ''
  
  function typeNextChar() {
    if (lineIndex >= lines.length) {
      // Animation complete - cursor already visible
      return
    }
    
    const lineObj = lines[lineIndex]
    const line = typeof lineObj === 'string' ? lineObj : lineObj.text
    const lineType = typeof lineObj === 'string' ? null : lineObj.type
    
    if (charIndex < line.length) {
      const char = line[charIndex]
      if (charIndex === 0 && lineType) {
        // Add span wrapper for styled lines
        const className = lineObj.className ? `terminal-line terminal-line-${lineType} ${lineObj.className}` : `terminal-line terminal-line-${lineType}`
        displayedText += `<span class="${className}">`
      }
      displayedText += char
      if (charIndex === line.length - 1 && lineType) {
        displayedText += '</span>'
      }
      terminalContent.innerHTML = displayedText
      // Auto-scroll to bottom as text is added
      const terminalScreen = document.querySelector('.terminal-screen')
      if (terminalScreen) {
        terminalScreen.scrollTop = terminalScreen.scrollHeight
      }
      charIndex++
      setTimeout(typeNextChar, 20) // 20ms delay between characters (faster)
    } else {
      // Line complete, move to next line
      displayedText += '\n'
      terminalContent.innerHTML = displayedText
      // Auto-scroll to bottom after line break
      const terminalScreen = document.querySelector('.terminal-screen')
      if (terminalScreen) {
        terminalScreen.scrollTop = terminalScreen.scrollHeight
      }
      lineIndex++
      charIndex = 0
      
      // Pause between sections (longer pause after empty lines)
      const isEmptyLine = typeof lineObj === 'string' && lineObj === ''
      const pause = isEmptyLine ? 400 : 100
      setTimeout(typeNextChar, pause)
    }
  }
  
  // Start typing after a brief delay
  setTimeout(() => {
    typeNextChar()
  }, 500)
}

function showBasketPage() {
  // Reset viewport zoom on mobile (prevents zoom persistence)
  resetViewportZoom()
  
  // Force scroll to top before rendering
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  window.scrollTo(0, 0)
  if (document.documentElement) {
    document.documentElement.scrollTop = 0
    document.documentElement.scrollTo(0, 0)
  }
  if (document.body) {
    document.body.scrollTop = 0
    document.body.scrollTo(0, 0)
  }
  if (document.scrollingElement) {
    document.scrollingElement.scrollTop = 0
    document.scrollingElement.scrollTo(0, 0)
  }
  
  // Check if mobile and add mobile-view class
  const isMobileView = window.innerWidth <= 768
  if (isMobileView) {
    document.body.classList.add('mobile-view')
  } else {
    document.body.classList.remove('mobile-view')
  }
  
  // Disable smooth scrolling for other pages
  document.documentElement.style.scrollBehavior = 'auto'
  document.querySelector('#app').innerHTML = `
    <div class="monitor-wrapper">
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
                            <img src="/cigtshirt.svg" alt="${item.name}" width="250" height="250" />
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
          </div>
        </div>
      </div>
    </div>
  `
  
  // Force scroll to top after rendering
  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    window.scrollTo(0, 0)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0
      document.documentElement.scrollTo(0, 0)
    }
    if (document.body) {
      document.body.scrollTop = 0
      document.body.scrollTo(0, 0)
    }
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = 0
      document.scrollingElement.scrollTo(0, 0)
    }
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
      } else if (buttonText === 'readme') {
        showReadmeModal()
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
  
  // Convert SVG images to inline on mobile (prevents iOS Safari rasterization)
  if (window.innerWidth <= 768) {
    // Try multiple times to ensure conversion happens
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 50)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 200)
    setTimeout(() => {
      convertAllSVGImagesToInline()
    }, 500)
  }
  
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
