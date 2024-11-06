# TabFlow

TabFlow is a Chrome extension designed to help you manage inactive tabs, reducing clutter and optimizing memory usage in your browser. With custom inactivity settings, intelligent grouping, and automatic cleanup, TabFlow ensures a streamlined and efficient browsing experience.

## ✨ Features

- **Automatic Inactivity Tracking:** Tabs inactive for a set period are automatically detected.
- **Intelligent Grouping:** Inactive tabs are grouped together to reduce clutter, making it easy to find active tabs.
- **Automatic Deletion:** Tabs that remain inactive for extended periods can be automatically closed, freeing up resources.
- **Undo Action:** Accidentally closed tabs can be recovered with the undo feature.
- **Customizable Settings:** Adjust inactivity thresholds, enable/disable undo alerts, and tailor TabFlow to suit your workflow.

## 🚀 Getting Started

### Installation

1. Navigate to the [TabFlow Chrome Web Store page](https://chrome.google.com/webstore/detail/tabflow/abcdefghijklmnop) and click "Add to Chrome".
2. Follow the on-screen instructions to install the extension.

### Usage

1. Once installed, TabFlow will start managing tabs automatically.
2. You'll see inactive tabs grouped in a hidden "Inactive Tabs" group after the specified inactivity period.
3. Tabs will be deleted based on your settings unless they're restored through the undo prompt.

## ⚙️ Settings

To access TabFlow settings, click on the extension icon in the Chrome toolbar.

1. **Inactivity Threshold**: Adjust the time (in minutes) after which tabs are considered inactive.
2. **Grouping Options**:
   - **Move inactive tabs to a group** for a specified period.
   - **Immediate deletion** of inactive tabs.
3. **Undo Alerts**: Enable or disable the undo alert shown after tab deletion.
4. **Advanced Settings**:
   - Set custom notifications.
   - Control deletion timing and inactivity checks.
5. **Adjustable Cleanup Button**: A CTA button allows you to manually trigger inactive tab cleanup.

## 🛠️ Development

If you'd like to contribute to TabFlow, please follow these steps:

1. Fork the [TabFlow repository](https://github.com/yourusername/TabFlow) on GitHub.
2. Clone your forked repository and navigate to the project directory.
3. Install dependencies using your preferred package manager (e.g., `npm install` or `yarn install`).
4. Start the development server with `npm run dev` or `yarn run dev`.
5. Make your changes and test them locally.
6. Commit your changes and submit a pull request to the original repository.

### File Structure

- **src/**: Contains core extension logic.
- **background.js**: Manages tab inactivity tracking and automatic deletion.

## 📢 Contributing

Contributions are welcome! If you'd like to improve TabFlow, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/AmazingFeature`).
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4. Push to the branch (`git push origin feature/AmazingFeature`).
5. Open a pull request.

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Enjoy a clutter-free browsing experience with **TabFlow**!
