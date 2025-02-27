(function(Scratch) {
  'use strict';
 function findReactComponent(element) {
    let fiber = element[Object.keys(element).find(key => key.startsWith("__reactInternalInstance$"))];
    if (fiber == null) return null;

    const go = fiber => {
        let parent = fiber.return;
        while (typeof parent.type == "string") {
            parent = parent.return;
        }
        return parent;
    };
    fiber = go(fiber);
    while(fiber.stateNode == null) {
        fiber = go(fiber);
    }
    return fiber.stateNode;
}
  window.vm = findReactComponent(document.getElementsByClassName("stage-header_stage-size-row_14N65")[0]).props.vm;
if (!Scratch) {
    Scratch = {
      // @ts-expect-error
      BlockType: {
        COMMAND: 'command',
        REPORTER: 'reporter',
        BOOLEAN: 'Boolean',
        HAT: 'hat'
      },
      // @ts-expect-error
      ArgumentType: {
        STRING: 'string',
        NUMBER: 'number',
        COLOR: 'color',
        ANGLE: 'angle',
        BOOLEAN: 'Boolean',
        MATRIX: 'matrix',
        NOTE: 'note'
      },
      // @ts-expect-error
      vm: window.vm,
      extensions: {
        unsandboxed: true,
        register: (object) => {
          // @ts-expect-error
          const serviceName = vm.extensionManager._registerInternalExtension(object);
          // @ts-expect-error
          vm.extensionManager._loadedExtensions.set(object.getInfo().id, serviceName);
        }
      }
    };
    if (!Scratch.vm) {
      alert("Error: VM does not exist. (line 53)")
      throw new Error('The VM does not exist');
    }
  }


  const vm = Scratch.vm;
  const runtime = vm.runtime;
  const canvas = runtime.renderer.canvas;
  const gl = runtime.renderer._gl;
  if (!Scratch.extensions.unsandboxed) {
    alert('Files must run unsandboxed!')
    throw new Error('Files Extension must be run unsandboxed!');
  }

  const MODE_MODAL = 'modal';
  const MODE_IMMEDIATELY_SHOW_SELECTOR = 'selector';
  const MODE_ONLY_SELECTOR = 'only-selector';
  const ALL_MODES = [MODE_MODAL, MODE_IMMEDIATELY_SHOW_SELECTOR, MODE_ONLY_SELECTOR];
  let openFileSelectorMode = MODE_MODAL;

  const AS_TEXT = 'text';
  const AS_DATA_URL = 'url';

  /**
   * @param {string} accept See MODE_ constants above
   * @param {string} as See AS_ constants above
   * @returns {Promise<string>} format given by as parameter
   */
  const showFilePrompt = (accept, as) => new Promise((_resolve) => {
    // We can't reliably show an <input> picker without "user interaction" in all environments,
    // so we have to show our own UI anyways. We may as well use this to implement some nice features
    // that native file pickers don't have:
    //  - Easy drag+drop
    //  - Reliable cancel button (input cancel event is still basically nonexistent)
    //    This is important so we can make this just a reporter instead of a command+hat block.
    //    Without an interface, the script would be stalled if the prompt was just cancelled.

    /** @param {string} text */
    const callback = (text) => {
      _resolve(text);
      outer.remove();
      document.body.removeEventListener('keydown', handleKeyDown);
    };

    let isReadingFile = false;

    /** @param {File} file */
    const readFile = (file) => {
      if (isReadingFile) {
        return;
      }
      isReadingFile = true;

      const reader = new FileReader();
      reader.onload = () => {
        callback(/** @type {string} */ (reader.result));
      };
      reader.onerror = () => {
        console.error('Failed to read file as text', reader.error);
        callback('');
      };
      if (as === AS_TEXT) {
        reader.readAsText(file);
      } else {
        reader.readAsDataURL(file);
      }
    };

    /** @param {KeyboardEvent} e */
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        callback('');
      }
    };
    document.body.addEventListener('keydown', handleKeyDown, {
      capture: true
    });

    const INITIAL_BORDER_COLOR = '#888';
    const DROPPING_BORDER_COLOR = '#03a9fc';

    const outer = document.createElement('div');
    outer.className = 'extension-content';
    outer.style.position = 'fixed';
    outer.style.top = '0';
    outer.style.left = '0';
    outer.style.width = '100%';
    outer.style.height = '100%';
    outer.style.display = 'flex';
    outer.style.alignItems = 'center';
    outer.style.justifyContent = 'center';
    outer.style.background = 'rgba(0, 0, 0, 0.5)';
    outer.style.zIndex = '20000';
    outer.style.color = 'black';
    outer.style.colorScheme = 'light';
    outer.addEventListener('dragover', (e) => {
      if (e.dataTransfer.types.includes('Files')) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        modal.style.borderColor = DROPPING_BORDER_COLOR;
      }
    });
    outer.addEventListener('dragleave', () => {
      modal.style.borderColor = INITIAL_BORDER_COLOR;
    });
    outer.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) {
        e.preventDefault();
        readFile(file);
      }
    });
    outer.addEventListener('click', (e) => {
      if (e.target === outer) {
        callback('');
      }
    });

    const modal = document.createElement('button');
    modal.style.boxShadow = '0 0 10px -5px currentColor';
    modal.style.cursor = 'pointer';
    modal.style.font = 'inherit';
    modal.style.background = 'white';
    modal.style.padding = '16px';
    modal.style.borderRadius = '16px';
    modal.style.border = `8px dashed ${INITIAL_BORDER_COLOR}`;
    modal.style.position = 'relative';
    modal.style.textAlign = 'center';
    modal.addEventListener('click', () => {
      input.click();
    });
    modal.focus();
    outer.appendChild(modal);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', (e) => {
      // @ts-expect-error
      const file = e.target.files[0];
      if (file) {
        readFile(file);
      }
    });

    const title = document.createElement('div');
    title.textContent = 'Select or drop file';
    title.style.fontSize = '1.5em';
    title.style.marginBottom = '8px';
    modal.appendChild(title);

    const subtitle = document.createElement('div');
    const formattedAccept = accept || 'any';
    subtitle.textContent = `Accepted formats: ${formattedAccept}`;
    modal.appendChild(subtitle);

    document.body.appendChild(outer);

    if (openFileSelectorMode === MODE_IMMEDIATELY_SHOW_SELECTOR || openFileSelectorMode === MODE_ONLY_SELECTOR) {
      input.click();
    }

    if (openFileSelectorMode === MODE_ONLY_SELECTOR) {
      // Note that browser support for cancel is currently quite bad
      input.addEventListener('cancel', () => {
        callback('');
      });
      outer.remove();
    }
  });

  /**
   * @param {string} text Text to download
   * @param {string} file Name of the file
   */
  const download = (text, file) => {
    const blob = new Blob([text]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = file;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  class Files {
    getInfo () {
      return {
        id: 'files',
        name: 'Files',
        color1: '#fcb103',
        color2: '#db9a37',
        color3: '#db8937',
        blocks: [
          {
            opcode: 'showPicker',
            blockType: Scratch.BlockType.REPORTER,
            text: 'open a file',
            disableMonitor: true,
            hideFromPalette: true
          },
          {
            opcode: 'showPickerExtensions',
            blockType: Scratch.BlockType.REPORTER,
            text: 'open a [extension] file',
            arguments: {
              extension: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '.txt'
              }
            },
            hideFromPalette: true
          },

          {
            opcode: 'showPickerAs',
            blockType: Scratch.BlockType.REPORTER,
            text: 'open a file as [as]',
            arguments: {
              as: {
                type: Scratch.ArgumentType.STRING,
                menu: 'encoding'
              }
            }
          },
          {
            opcode: 'showPickerExtensionsAs',
            blockType: Scratch.BlockType.REPORTER,
            text: 'open a [extension] file as [as]',
            arguments: {
              extension: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: '.txt'
              },
              as: {
                type: Scratch.ArgumentType.STRING,
                menu: 'encoding'
              }
            }
          },

          '---',

          {
            opcode: 'download',
            blockType: Scratch.BlockType.COMMAND,
            text: 'download [text] as [file]',
            arguments: {
              text: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello, world!'
              },
              file: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'save.txt'
              }
            }
          },
          {
            opcode: 'setOpenMode',
            blockType: Scratch.BlockType.COMMAND,
            text: 'set open file selector mode to [mode]',
            arguments: {
              mode: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: MODE_MODAL,
                menu: 'automaticallyOpen'
              }
            }
          }
        ],
        menus: {
          encoding: {
            acceptReporters: true,
            items: [
              {
                text: 'text',
                value: AS_TEXT
              },
              {
                text: 'data: URL',
                value: AS_DATA_URL
              }
            ]
          },
          automaticallyOpen: {
            acceptReporters: true,
            items: [
              {
                text: 'show modal',
                value: MODE_MODAL
              },
              {
                text: 'open selector immediately',
                value: MODE_IMMEDIATELY_SHOW_SELECTOR
              }
            ]
          }
        }
      };
    }

    showPicker () {
      return showFilePrompt('', AS_TEXT);
    }

    showPickerExtensions (args) {
      return showFilePrompt(args.extension, AS_TEXT);
    }

    showPickerAs (args) {
      return showFilePrompt('', args.as);
    }

    showPickerExtensionsAs (args) {
      return showFilePrompt(args.extension, args.as);
    }

    download (args) {
      download(args.text, args.file);
    }

    setOpenMode (args) {
      if (ALL_MODES.includes(args.mode)) {
        openFileSelectorMode = args.mode;
      } else {
        console.warn(`unknown mode`, args.mode);
      }
    }
  }
 var extensionInstance = new Files(window.vm.extensionManager.runtime)
    var serviceName = window.vm.extensionManager._registerInternalExtension(extensionInstance)
    window.vm.extensionManager._loadedExtensions.set(extensionInstance.getInfo().id, serviceName)
  //Scratch.extensions.register(new Files());
})(window.Scratch);
