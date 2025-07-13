import BaseWidget from './base.js';

export default class FrameWidget extends BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    super(id, container, publishFn, parentGrid);
    this.config = {
        title: 'My Group',
    };
    this.nestedGrid = null;
    this.topic = '';
    this.render();
  }

  render() {
    this.container.style.padding = '0';
    this.container.style.overflow = 'visible';
    this.container.innerHTML = `
        <div class="grid-stack nested-grid">
            </div>
    `;
    
    const nestedGridElement = this.container.querySelector('.nested-grid');
    this.nestedGrid = GridStack.init({
        float: true,
        acceptWidgets: true,
    }, nestedGridElement);

    this.updateTitleInHeader();
  }
  
  updateTitleInHeader() {
      const header = this.container.parentElement.querySelector('.widget-header-topic');
      if (header) {
          header.textContent = this.config.title;
      }
  }

  getConfigForm() {
    return `
      <label>Frame Title:</label>
      <input id="cfg_title" type="text" value="${this.config.title}">
    `;
  }

  saveConfig() {
    this.oldTopic = '';
    this.topic = '';
    this.config.title = document.getElementById('cfg_title').value.trim();
    this.updateTitleInHeader();
  }
  
  getOptions() {
      return this.config;
  }
  
  setOptions(o) {
      this.config = { ...this.config, ...o };
  }
  
  destroy() {
      if (this.nestedGrid) {
          this.nestedGrid.destroy(true);
      }
  }

  onMessage(payload) {}
  onThemeChanged() {}
}