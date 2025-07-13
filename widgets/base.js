export default class BaseWidget {
  constructor(id, container, publishFn, parentGrid) {
    this.id = id;
    this.container = container;
    this.publish = publishFn;
    this.parentGrid = parentGrid;
    
    this.topic = 'no/topic/defined';
    this.jsonPath = '';
  }

  onMessage(payload, topic) {}
  onThemeChanged() {}
  onConfigFormRendered() {}

  getBaseConfigForm() {
    return `
      <label>Subscription Topic:</label>
      <input id="cfg_topic" type="text" value="${this.topic}">
      <label>JSON Path (optional):</label>
      <input id="cfg_jsonPath" type="text" value="${this.jsonPath}" placeholder="e.g. data.value">
      <hr>
    `;
  }
  
  saveBaseConfig() {
      const newTopic = document.getElementById('cfg_topic').value.trim();
      this.oldTopic = this.topic; 
      this.topic = newTopic;
      this.jsonPath = document.getElementById('cfg_jsonPath').value.trim();
  }

  getConfigForm() { return 'No configuration options available.'; }
  saveConfig() {}
  getOptions() { return {}; }
  setOptions(options) {
      this.topic = options.topic || this.topic;
      this.jsonPath = options.jsonPath || this.jsonPath;
  }
  destroy() {}
}