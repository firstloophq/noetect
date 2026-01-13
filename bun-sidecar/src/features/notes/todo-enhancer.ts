import { EditorView } from "prosemirror-view";
import { toggleTodoAtLine } from "./simple-todo";

// Enhance the editor with todo functionality
export function enhanceEditorWithTodos(view: EditorView) {
  const editorElement = view.dom;

  // Add click handler for checkbox toggling
  const handleClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // Check if click was on text that looks like a checkbox
    if (target.textContent) {
      const text = target.textContent;
      const checkboxRegex = /- \[([ x])\]/;
      const match = text.match(checkboxRegex);

      if (match) {
        // Find the position of the checkbox in the text
        const checkboxStart = text.indexOf('- [');
        const checkboxEnd = checkboxStart + 5; // Length of "- [x]"

        // Check if click was within the checkbox area
        const range = document.createRange();
        range.setStart(target.firstChild!, checkboxStart);
        range.setEnd(target.firstChild!, checkboxEnd);
        const rect = range.getBoundingClientRect();

        if (event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom) {
          event.preventDefault();

          // Toggle the todo
          toggleTodoAtLine(view.state, view.dispatch);
        }
      }
    }
  };

  editorElement.addEventListener('click', handleClick);

  // Style todo items
  const updateTodoStyling = () => {
    const paragraphs = editorElement.querySelectorAll('p');

    paragraphs.forEach((p) => {
      const text = p.textContent || '';
      const hasCompleted = p.classList.contains('todo-completed');
      const hasIncomplete = p.classList.contains('todo-incomplete');

      // Check if it's a completed todo
      if (text.includes('- [x]')) {
        if (!hasCompleted) {
          p.classList.remove('todo-incomplete');
          p.classList.add('todo-completed');
        }
      } else if (text.includes('- [ ]')) {
        if (!hasIncomplete) {
          p.classList.remove('todo-completed');
          p.classList.add('todo-incomplete');
        }
      } else {
        // Not a todo, remove both classes if present
        if (hasCompleted || hasIncomplete) {
          p.classList.remove('todo-completed', 'todo-incomplete');
        }
      }
    });
  };

  // Update styling on content changes (but ignore attribute changes to prevent loops)
  const observer = new MutationObserver((mutations) => {
    // Only respond to content changes, not attribute changes (which include our class changes)
    const hasContentChanges = mutations.some(mutation =>
      mutation.type === 'childList' ||
      (mutation.type === 'characterData')
    );

    if (hasContentChanges) {
      updateTodoStyling();
    }
  });
  observer.observe(editorElement, {
    childList: true,
    subtree: true,
    characterData: true,
    // Don't observe attribute changes to prevent infinite loops from our CSS class changes
    attributes: false
  });

  // Initial styling update
  updateTodoStyling();

  // Return cleanup function
  return () => {
    editorElement.removeEventListener('click', handleClick);
    observer.disconnect();
  };
}