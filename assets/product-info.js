if (!customElements.get("product-info")) {
  customElements.define(
    "product-info",
    class ProductInfo extends HTMLElement {
      constructor() {
        super();
        this.input = this.querySelector(".quantity__input");
        this.currentVariant = this.querySelector(".product-variant-id");
        this.variantSelects = this.querySelector("variant-radios");
        this.submitButton = this.querySelector('[type="submit"]');
        this.VariantId = this.querySelector(".product-variant-id");

        // call varientDropdownChangeHandler here
        this.varientDropdownChangeHandler();
      }

      cartUpdateUnsubscriber = undefined;
      variantChangeUnsubscriber = undefined;

      varientDropdownChangeHandler() {
        this.variantOptions = ["Unselected", "Small", "Medium", "Large"];
        this.CreateDiv = document.createElement("div");
        // add class to div and style to display flex, flex-direction: column and gap: 2rem
        this.CreateDiv.classList.add("variant-selecting");

        this.variantDropdown = document.createElement("select");
        this.variantDropdown.classList.add("variant-dropdown"); // Add a class for styling
        this.Name = document.createElement("p");
        this.Name.textContent = "Size";

        this.variantOptions.forEach((option) => {
          const optionElement = document.createElement("option");
          optionElement.value = option; // Set option value
          optionElement.text = option; // Set visible option text
          this.variantDropdown.appendChild(optionElement); // Append option to dropdown
        });

        const sr = `
        <div
        style=" display: flex; flex-direction: column; gap: rem;"
         class="variant-selecting">
        <p class="variant-selecting__name">Size</p>
        <select class="variant-dropdown">
          <option value="Unselected">Unselected</option>
          <option value="Small">Small</option>
          <option value="Medium">Medium</option>
          <option value="Large">Large</option>
        </select>
      </div>
        `;

        this.CreateDiv.innerHTML = sr;
        // append dropdown to below the variant radios
        if (this.variantSelects) {
          this.variantSelects.appendChild(this.CreateDiv);
        } else {
          this.input.parentNode.insertAdjacentElement(
            // if no variant radios, append dropdown below the quantity input
            "afterend",
            this.CreateDiv
          );
        }

        // add varientDrodown value to class="cart-item__details"

        const formData = {
          items: [
            {
              id: this.VariantId.value,
              options_with_values: [
                {
                  name: "Size",
                  value: this.variantDropdown.value,
                },
              ],
            },
          ],
        };

        // Update formData whenever the dropdown value changes
        this.variantDropdown.addEventListener("change", () => {
          formData.items[0].options_with_values[0].value =
            this.variantDropdown.value;
          // Update the URL when the variant changes
          const selectedVariant = this.VariantId.value; // Get the current variant ID
          const selectedSize = this.variantDropdown.value; // Get the selected size
          const url = new URL(window.location.href);
          url.searchParams.set("variant", selectedVariant); // Update the 'variant' parameter
          window.history.pushState({}, "", url);
        });

        this.submitButton.addEventListener("click", () => {
          fetch(
            window.Shopify.routes.root + `/admin/api/2023-11/products.json`,
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                "X-SHOPIFY-ACCESS-TOKEN": "",
              },
              body: JSON.stringify(formData),
            }
          )
            .then((response) => {
              console.log(response);
              return response.json();
            })
            .catch((error) => {
              console.error("Error:", error);
            });
        });

        //   if (formData.items[0].options_with_values[0].value === "Black") {
        //     // add another items to formData

        //     fetch(window.Shopify.routes.root + "cart/add.js", {
        //       method: "POST",
        //       headers: {
        //         "Content-Type": "application/json",
        //       },
        //       body: JSON.stringify({
        //         items: [
        //           {
        //             id: 43344076275881,
        //             quantity: 1,
        //             properties: {
        //               Size: "Black",
        //             },
        //             price: 0.01,
        //             original_line_price: 0.01,
        //           },
        //         ],
        //       }),
        //     })
        //       .then((response) => {
        //         console.log(response);
        //         return response.json();
        //       })
        //       .catch((error) => {
        //         console.error("Error:", error);
        //       });
        //   }
        // });
      }

      connectedCallback() {
        if (!this.input) return;
        this.quantityForm = this.querySelector(".product-form__quantity");
        if (!this.quantityForm) return;
        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(
            PUB_SUB_EVENTS.cartUpdate,
            this.fetchQuantityRules.bind(this)
          );
        }
        this.variantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.variantChange,
          (event) => {
            const sectionId = this.dataset.originalSection
              ? this.dataset.originalSection
              : this.dataset.section;
            if (event.data.sectionId !== sectionId) return;
            this.updateQuantityRules(event.data.sectionId, event.data.html);
            this.setQuantityBoundries();
          }
        );
      }

      disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.input.dataset.cartQuantity
            ? parseInt(this.input.dataset.cartQuantity)
            : 0,
          min: this.input.dataset.min ? parseInt(this.input.dataset.min) : 1,
          max: this.input.dataset.max ? parseInt(this.input.dataset.max) : null,
          step: this.input.step ? parseInt(this.input.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.input.min = min;
        this.input.max = max;
        this.input.value = min;
        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        if (!this.currentVariant || !this.currentVariant.value) return;
        this.querySelector(
          ".quantity__rules-cart .loading-overlay"
        ).classList.remove("hidden");
        fetch(
          `${this.dataset.url}?variant=${this.currentVariant.value}&section_id=${this.dataset.section}`
        )
          .then((response) => {
            return response.text();
          })
          .then((responseText) => {
            const html = new DOMParser().parseFromString(
              responseText,
              "text/html"
            );
            this.updateQuantityRules(this.dataset.section, html);
            this.setQuantityBoundries();
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.querySelector(
              ".quantity__rules-cart .loading-overlay"
            ).classList.add("hidden");
          });
      }

      updateQuantityRules(sectionId, html) {
        const quantityFormUpdated = html.getElementById(
          `Quantity-Form-${sectionId}`
        );
        const selectors = [
          ".quantity__input",
          ".quantity__rules",
          ".quantity__label",
        ];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === ".quantity__input") {
            const attributes = [
              "data-cart-quantity",
              "data-min",
              "data-max",
              "step",
            ];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null)
                current.setAttribute(attribute, valueUpdated);
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }
    }
  );
}
