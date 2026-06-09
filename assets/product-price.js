import { ThemeEvents, VariantUpdateEvent } from '@theme/events';
import { Component } from '@theme/component';

/**
 * @typedef {Object} ProductPriceRefs
 * @property {HTMLElement} priceContainer
 * @property {HTMLElement} [volumePricingNote]
 */

/**
 * A custom element that displays a product price.
 * This component listens for variant update events and updates the price display accordingly.
 * It handles price updates from two different sources:
 * 1. Variant picker (in quick add modal or product page)
 * 2. Swatches variant picker (in product cards)
 *
 * @extends {Component<ProductPriceRefs>}
 */
class ProductPrice extends Component {
  connectedCallback() {
    super.connectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.addEventListener(ThemeEvents.variantUpdate, this.updatePrice);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    const closestSection = this.closest('.shopify-section, dialog');
    if (!closestSection) return;
    closestSection.removeEventListener(ThemeEvents.variantUpdate, this.updatePrice);
  }

  /**
   * Updates the price and volume pricing note.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updatePrice = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (event.target instanceof HTMLElement && event.target.dataset.productId !== this.dataset.productId) {
      return;
    }

    const { priceContainer, volumePricingNote } = this.refs;
    // Find the new product-price element in the updated HTML
    const newProductPrice = event.detail.data.html.querySelector(
      `product-price[data-block-id="${this.dataset.blockId}"]`
    );
    if (!newProductPrice) return;

    // Update price container
    const newPrice = newProductPrice.querySelector('[ref="priceContainer"]');
    if (newPrice && priceContainer) {
      // Preserve the existing DOM node to avoid unmounting the custom element
      // and causing visual flicker. Replace only the inner content.
      try {
        // Copy child nodes from newPrice into the existing priceContainer
        priceContainer.innerHTML = newPrice.innerHTML;

        // Copy attributes from newPrice to priceContainer (if any) except id
        for (const attr of Array.from(newPrice.attributes || [])) {
          if (attr.name === 'id') continue;
          priceContainer.setAttribute(attr.name, attr.value);
        }
      } catch (err) {
        // Fallback: if something goes wrong, replace the node as before
        priceContainer.replaceWith(newPrice);
      }
    }

    // Update volume pricing note
    const newNote = newProductPrice.querySelector('[ref="volumePricingNote"]');

    if (!newNote) {
      volumePricingNote?.remove();
    } else {
      const clonedNote = /** @type {Element} */ (newNote.cloneNode(true));
      if (!volumePricingNote && priceContainer) {
        priceContainer.insertAdjacentElement('afterend', clonedNote);
      } else if (volumePricingNote) {
        volumePricingNote.replaceWith(clonedNote);
      }
    }

    // Update installments (SPI banner) variant ID to trigger payment terms re-render
    const input_selector = `#product-form-installment-${this.dataset.blockId} input[name="id"]`;
    const installmentsInput = /** @type {HTMLInputElement|null} */ (this.querySelector(input_selector));
    if (installmentsInput) {
      installmentsInput.value = event.detail.resource?.id ?? '';
      installmentsInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };
}

if (!customElements.get('product-price')) {
  customElements.define('product-price', ProductPrice);
}
