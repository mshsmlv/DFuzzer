const esprima = require('esprima');
const escope = require('escope');
const estraverse = require('estraverse');
const escodegen = require('escodegen');
const esquery = require('esquery');

// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html - вся инфа по возможным нодам

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ./data-set/basic/testincops.js 0
// ./data-set/basic/doMath.js 0
// ./data-set/basic/testMulOverflow.js 0
// ./data-set/basic/testSwitchString.js 1
// ./data-set/basic/testPrimitiveConstructorPrototype.js 2
// ./data-set/basic/joinTest.js index: 2

class NodeReplacer {
  constructor(ast) {
    this.ast = ast;
    this.scopeManager = escope.analyze(this.ast);

    this.inLoop = false;
    this.inSwitch = false;

    // Helps to control variables.
    this.globalVariables = new Map();
    this.functionVariables = new Map();
    this.newNodeVariables = new Map();
    this.isNeedRefreshScopeManager = false;

    // we can have nested function declarations and
    // leaving function context not garantee that we left function.
    // [fun_name1, fun_name2], just for debug.
    this.functionStack = [];
    // [map1{}, map2{}],  stores previous scopes to restore scope of wrapper
    this.prevScope = [];

    // it collects new objects from sources during mutating.
    this.nodesToInsert = new Map();
  }

  inFunction() {
    if (this.functionStack.length > 0) {
      return true;
    }
    return false;
  }

  __extractVariableNames(varMap, varArray) {
    for (let i = 0; i < varArray.length; i++) {
      varMap.set(varArray[i].name, 1);
    }
  }

  extractGlobalVariables(varArray) {
    this.__extractVariableNames(this.globalVariables, varArray);
  }

  extractFunctionVariables(varArray) {
    this.__extractVariableNames(this.functionVariables, varArray);
  }

  extractNewNodeVaribles(varArray) {
    this.__extractVariableNames(this.newNodeVariables, varArray);
  }

  freeFunctionVariables() {
    this.functionVariables = this.prevScope.pop();
    if (!this.functionVariables) {
      this.functionVariables = new Map();
    }

    this.functionStack.pop();
  }

  freeNewNodeVariables() {
    this.newNodeVariables = new Map();
  }

  freeVariables(varArray) {
    const self = this;
    for (let i = 0; i < varArray.length; i++) {
      self.globalVariables.set(varArray[i].name, 1);
    }
  }

  varExists(name) {
    if (this.globalVariables.get(name)) {
      return true;
    }
    if (this.newNodeVariables.get(name)) {
      return true;
    }
    if (this.functionVariables.get(name)) {
      return true;
    }
    return false;
  }

  randVariableName() {
    const merged = new Map([
      ...this.globalVariables,
      ...this.newNodeVariables,
      ...this.functionVariables,
    ]);
    return randomChoice(Array.from(merged.keys()));
  }

  // it skipes nodes which are not applicable for the current context.
  __nodeIsApplicable(node) {
    const self = this;
    let isApplicable = true;
    estraverse.traverse(node, {
      enter: function(node, parent) {
        switch (node.type) {
          case 'BreakStatement':
            if (!self.inLoop && !self.inSwitch) {
              isApplicable = false;
            };
            break;
          case 'ReturnStatement':
            if (!self.inFunction()) {
              isApplicable = false;
            }
          case 'ContinueStatement':
            if (!self.inLoop) {
              isApplicable = false;
            }
        }
      },
      leave: function(node, parent) {},
    });
    return isApplicable;
  }

  // it gets applicable node for the current context with @aimed_type.
  // if @index is set it will return: all_applicable_nodes_from_ast[index].
  // if @index is not set it will return:
  // all_applicable_nodes_from_ast[random_index].
  __getNode(ast, aimedType, index) {
    const self = this;
    const resNodes = [];
    estraverse.traverse(ast, {
      enter: function(node, parent) {
        if (node.type == aimedType && self.__nodeIsApplicable(node)) {
          resNodes.push(node);
        }
      },
      leave: function(node, parent) {
      },
    });

    if (!index) {
      index = Math.floor(Math.random() * resNodes.length);
    };

    console.log('index:', index);
    return [resNodes[index], ast];
  }

  getNode(aimedType) {
    const self = this;

    while (true) {
      const treeFile = './data-set/basic/' + randomChoice(trees);
      const code = fs.readFileSync(treeFile, 'utf-8');

      let ast;
      try {
        ast = esprima.parse(code);
      } catch (e) {
        continue;
      }
      console.log(treeFile);
      const [newNode, sourceTree] = self.__getNode(ast, aimedType);
      if (newNode) {
        return [newNode, sourceTree];
      }
      continue;
    }
  }

  // just for debug. It gets a node from a specified tree
  // with the specified index.
  getSpecifiedNode(treeFile, nodeIndex, aimedType) {
    const self = this;

    const code = fs.readFileSync(treeFile, 'utf-8');
    const ast = esprima.parse(code);

    return self.__getNode(ast, aimedType, nodeIndex);
  }

  insertNodeFromSource(node, sourceTree, selector) {
    const self = this;

    // if the node is in a queue for insertion already, skip it.
    if (self.nodesToInsert.get(node.name)) {
      return;
    }

    // add new node from source tree if it doesn't exist in the original ast.
    if (esquery.query(self.ast, selector).length == 0) {
      const nodeFromSource = esquery.query(sourceTree, selector);
      if (nodeFromSource.length > 0) {
        self.nodesToInsert.set(
            node.name,
            {
              node: nodeFromSource[0],
              source: sourceTree,
            },
        );
      }
    }
  }

  // change variables name in new node
  // if they are not declarated to the declarated variables. It can be:
  //
  // - global variable from mutated ast
  // - variable which are accsessible for the current context
  // (visible in a function and global variables)
  //
  // OR leave variable name if it is declarated in new node
  //
  // Если мы идем вглубь дерева, а мы идем вглубь,
  // то видимость переменных сохраняется,просто добавляются новые.
  // Видимость переменных в джава-скрипт ограничивается только функциями.
  // https://habr.com/ru/post/78991/
  //
  //
  // отслеживать "CallExpression" тип и затягивать функции в мутируемое дерево,
  // если она не объявлена. Для этого нужно отслеживать глобальные функции,
  // которые объявлены. Если ее нет в этом массиве(или что это есть),
  // то вставляем.
  prepareNodeForInsertion(newNode, sourceTree) {
    const self = this;
    const sourceScopeManager = escope.analyze(sourceTree);

    estraverse.traverse(newNode, {
      enter: function(node, parent) {
        // returns list of variables which are declarated in a node.
        self.extractNewNodeVaribles(
            sourceScopeManager.getDeclaredVariables(node));

        if (/Function/.test(node.type)) {
          return; // do not replace function declaration names.
        }

        switch (node.name) {
          case 'console': return; // add standard modules here.
          case 'Math': return;
        }

        if (parent) {
          // it means we are in a function call.
          // if calling function not in the tree,
          // try to extraxt this node from the source tree.
          if (node.type == 'Identifier' &&
              parent.type == 'CallExpression') {
            self.insertNodeFromSource(
                node,
                sourceTree,
                `[type="FunctionDeclaration"][id.name="${node.name}"]`,
            );
            return; // do not replace function calls.
          }

          // we are in `new MyClass()` construction.
          // try to extraxt class definition from the source tres.
          if (node.type == 'Identifier' &&
              parent.type == 'NewExpression') {
            // Skip standard classes. TODO: Add other standard types.
            switch (node.name) {
              case 'Map':
              case 'Set':
              case 'Array': return;
            }

            self.insertNodeFromSource(
                node,
                sourceTree,
                `[type="ClassDeclaration"][id.name="${node.name}"]`,
            );
            return; // do not replace `new SomeClass()` constructions.
          }

          // `someClass.method`. replace only someClass.
          if (
            node.type == 'Identifier' &&
            parent.type == 'MemberExpression' &&
            node == parent.property &&
            !parent.computed) {
            return; // do not replace property calls.
          }
        }

        // And finaly replace the all rest.
        if (node.type == 'Identifier') {
          if (!self.varExists(node.name)) {
            node.name = self.randVariableName();
          };
        }
      },
      leave: function(node, parent) {},
    });
    self.freeNewNodeVariables();
  }

  // mutate_blocks replaces blocks:
  // "ForStatement":
  // "ForInStatement":
  // "IfStatement":
  // "DoWhileStatement":
  // "SwitchStatement":
  // "WhileStatement":
  // "WithStatement":
  // "BlockStatement":
  //
  // It queries new block with the same type from the given data-set.
  mutateBlocks() {
    const self = this;

    estraverse.replace(self.ast, {
      enter: function(node, parent) {
        if (self.isNeedRefreshScopeManager) {
          self.scopeManager = escope.analyze(self.ast);
          self.isNeedRefreshScopeManager = false;
        }

        if (/Function/.test(node.type)) {
          if (node.id) {
            self.functionStack.push(node.id.name);
          } else {
            self.functionStack.push('anon_function');
          }

          self.prevScope.push(new Map(self.functionVariables));
        }

        // Control new names.
        // If we are in function, add new variable to the function variables.
        // If not, add new variable to the global variables.
        if (self.inFunction()) {
          // skip function names -_0_0_-.
          if (!/Function/.test(node.type)) {
            self.extractFunctionVariables(
                self.scopeManager.getDeclaredVariables(node),
            );
          }
        } else {
          self.extractGlobalVariables(
              self.scopeManager.getDeclaredVariables(node),
          );
        }

        switch (node.type) {
          case 'DoWhileStatement':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement': self.inLoop = true;
          case 'SwitchStatement': self.isSwitch = true;
          case 'WithStatement': break;
            // case  "BlockStatement": break; // Нужен ли нам блок стейтмент?
          default: return;
        }

        const [newNode, sourceTree] = self.getNode(node.type);
        // const [newNode, sourceTree] = self.getSpecifiedNode(
        // "./tests/insert_function_test.js", 0, node.type);

        self.prepareNodeForInsertion(newNode, sourceTree);
        self.isNeedRefreshScopeManager = true;
        return newNode;
      },
      leave: function(node, parent) {
        // delete variables which are declarated in function node.
        if (/Function/.test(node.type)) {
          self.freeFunctionVariables();
        }

        switch (node.type) {
          case 'DoWhileStatement':
          case 'ForStatement':
          case 'ForInStatement':
          case 'ForOfStatement':
          case 'WhileStatement': self.inLoop = false; break;
          case 'SwitchStatement': self.isSwitch = false; break;
        }
      },
    });

    // we do it in the end because we ara in a global context -
    // it means that varriable arrays are empty.
    self.nodesToInsert.forEach(function(value, key, map) {
      self.prepareNodeForInsertion(value.node, value.source);
      self.ast.body.push(value.node);
    });
  }

  getMutatedCode() {
    return escodegen.generate(this.ast);
  }
}

// Math operator.
const binaryOperator =
  ['+', '-', '*', '/', '%', '**', '&', '|', '^', '<<', '>>', '>>>'];

// condition operator.
// const binaryCondition =
// ['==', '!=', '<', '<=', '>', '>=', '===', '!==', 'instanceof', 'in'];
const assignOperator =
  ['+=', '-=', '*=', '**=', '/=', '%=', '&=', '^=', '|=', '<<=', '>>=',
    '>>>=', '='];
// const booleanValue = ['false', 'true'];

// '...' 'typeof'
const unaryOperator =
  ['~', '-', '!', '++', '--', '+', ''];
const updateOperator = ['++', '--'];
const logicalOperator = ['&&', '||'];

// mutateExpressions just changes one simple expression to another one.
function mutateExpressions(ast) {
  estraverse.traverse(ast, {
    enter: function(node, parent) {
      switch (node.type) {
        case 'BinaryExpression':
          node.operator = randomChoice(binaryOperator);
        case 'LogicalExpression':
          node.operator = randomChoice(logicalOperator);
        case 'AssignmentExpression':
          node.operator = randomChoice(assignOperator);
        case 'UnaryExpression':
          node.operator = randomChoice(unaryOperator);
        case 'UpdateExpression':
          node.operator = randomChoice(updateOperator);
      }
    },
    leave: function(node, parent) {
    },
  });
};

module.exports = {
  mutateCode: mutateCode,
};

function getRandomInt(max) {
  return Math.floor(Math.random() * Math.floor(max));
}

function mutateCode(code) {
  const ast = esprima.parse(code);

  const suppaPupaMutationStratagy = getRandomInt(2);
  switch (suppaPupaMutationStratagy) {
    case 0: mutateExpressions(ast);
      return  escodegen.generate(ast);
    case 1: 
      const nodeReplacer = new NodeReplacer(ast);
      nodeReplacer.mutateBlocks();
      return nodeReplacer.getMutatedCode();
  }
}

const fs = require('fs');
const dataSetDir = './data-set/basic';
const trees = fs.readdirSync(dataSetDir);
/*
const seedFile = process.argv[2];
const raw = fs.readFileSync(seedFile, 'utf-8');
const mutatedCode = mutateCode(raw);

console.log('========MUTATED CODE ============');
console.log(mutatedCode);*/
