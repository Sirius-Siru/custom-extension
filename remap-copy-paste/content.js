(function () {
  const remappedKeys = new Map([
    ["c", "copy"],
    ["v", "paste"],
  ]);

  document.addEventListener(
    "keydown",
    (event) => {
      if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey) {
        return;
      }

      const action = remappedKeys.get(event.key.toLowerCase());
      if (!action) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      document.execCommand(action);
    },
    true
  );
})();
