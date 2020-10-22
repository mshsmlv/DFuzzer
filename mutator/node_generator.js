var esprima = require('esprima');
var escope = require('escope');
var estraverse = require('estraverse');
var escodegen = require('escodegen');


// https://esprima.readthedocs.io/en/latest/syntax-tree-format.html - вся инфа по возможным нодам

let binary_operator = ['+','-','*','/','%','**','&','|','^','<<','>>','>>>']; // Math operator
let binary_condition = ['==','!=','<','<=','>','>=','===','!==','instanceof','in']; // condition operator
let assign_operator = ['+=','-=','*=','**=','/=','%=','&=','^=','|=','<<=','>>=','>>>=','='];
let boolean_value = ['false','true'];
let unary_operator = ['~','-','!','++','--','+','']; // '...' 'typeof'
let update_operator = ['++','--'];
let logical_operator = ['&&','||'];

function randomChoice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}


function mutate(ast) {
    estraverse.traverse(ast, {
        enter: function (node, parent) {
            if (node.type == 'BinaryExpression') {
                node.operator = randomChoice(binary_operator);
            }
            if (node.type == 'LogicalExpression') {
                node.operator = randomChoice(logical_operator);
            }
            if (node.type == 'AssignmentExpression') {
                node.operator = randomChoice(assign_operator);
            }
            if (node.type == 'UnaryExpression') {
                node.operator = randomChoice(unary_operator);
            }
            if (node.type == 'UpdateExpression') {
                node.operator = randomChoice(update_operator);
            }
        },
        leave: function (node, parent) {
            if (node.type == 'VariableDeclarator')
              console.log(node.id.name);
        }
    });
};

var seed_file = process.argv[2];
var rf = require("fs");
var raw = rf.readFileSync(seed_file, "utf-8");

var ast = esprima.parse(raw);

mutate(ast);

console.log(escodegen.generate(ast));
