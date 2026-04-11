const isProductPage = window.location.pathname === '/product.html'
const banner = document.getElementById('cacheBanner')
const clearBtn = document.getElementById('clearBtn')

// ── CLEAR CACHE BUTTON ─────────────────────────────────
clearBtn.addEventListener('click', async () => {
  clearBtn.disabled = true
  clearBtn.textContent = 'Clearing...'

  try {
    if (isProductPage) {
      // Clear cache for this specific product
      const params = new URLSearchParams(window.location.search)
      const productId = params.get('id')
      await fetch(`/api/products/${productId}/cache`, { method: 'DELETE' })
    } else {
      // Clear cache for all products
      await fetch('/api/products/cache/all', { method: 'DELETE' })
    }

    banner.textContent = '🗑️ Cache Cleared — Reloading...'
    banner.className = 'cache-banner miss'

    // Reload page after short delay so user sees the message
    setTimeout(() => {
      window.location.reload()
    }, 800)

  } catch (err) {
    banner.textContent = '❌ Failed to clear cache'
    clearBtn.disabled = false
    clearBtn.textContent = 'Clear Cache'
  }
})

// ── HOME PAGE ──────────────────────────────────────────
if (!isProductPage) {
  const grid = document.getElementById('productGrid')

  fetch('/api/products')
    .then(res => res.json())
    .then(result => {
      if (!result.success) {
        grid.innerHTML = '<p>Failed to load products.</p>'
        return
      }

      if (result.fromCache) {
        banner.textContent = `✅ Cache HIT — Served from ${result.cacheSource}`
        banner.classList.add('hit')
      } else {
        banner.textContent = `❌ Cache MISS — Fetched from MongoDB`
        banner.classList.add('miss')
      }

      grid.innerHTML = result.data.map(product => `
        <div class="product-card" onclick="goToProduct('${product._id}')">
          <img
            src="${product.imageUrl}"
            alt="${product.name}"
            onerror="this.src='https://via.placeholder.com/400x200?text=No+Image'"
          />
          <div class="card-body">
            <h3>${product.name}</h3>
            <p class="price">Rs. ${product.price.toLocaleString()}</p>
            <span class="category">${product.category}</span>
          </div>
        </div>
      `).join('')
    })
    .catch(() => {
      grid.innerHTML = '<p>Error loading products.</p>'
    })
}

// ── PRODUCT PAGE ───────────────────────────────────────
if (isProductPage) {
  const detail = document.getElementById('productDetail')
  const params = new URLSearchParams(window.location.search)
  const productId = params.get('id')

  if (!productId) {
    detail.innerHTML = '<p>Product not found.</p>'
  } else {
    fetch(`/api/products/${productId}`)
      .then(res => res.json())
      .then(result => {
        if (!result.success) {
          detail.innerHTML = '<p>Product not found.</p>'
          return
        }

        if (result.fromCache) {
          banner.textContent = `✅ Cache HIT — Served from ${result.cacheSource}`
          banner.classList.add('hit')
        } else {
          banner.textContent = `❌ Cache MISS — Fetched from MongoDB`
          banner.classList.add('miss')
        }

        const p = result.data

        detail.innerHTML = `
          <img
            src="${p.imageUrl}"
            alt="${p.name}"
            onerror="this.src='https://via.placeholder.com/300x300?text=No+Image'"
          />
          <div class="detail-info">
            <h2>${p.name}</h2>
            <p class="price">Rs. ${p.price.toLocaleString()}</p>
            <span class="category">${p.category}</span>
            <p class="description">${p.description}</p>
            <p class="stock">${p.inStock ? '✅ In Stock' : '❌ Out of Stock'}</p>
          </div>
        `
      })
      .catch(() => {
        detail.innerHTML = '<p>Error loading product.</p>'
      })
  }
}

// ── Navigate to product page ───────────────────────────
function goToProduct(id) {
  window.location.href = `/product.html?id=${id}`
}