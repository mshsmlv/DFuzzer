
// table.wast:3
let $1 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x00");

// table.wast:4
let $2 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x01");

// table.wast:5
let $3 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x85\x80\x80\x80\x00\x01\x70\x01\x00\x00");

// table.wast:6
let $4 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x85\x80\x80\x80\x00\x01\x70\x01\x00\x01");

// table.wast:7
let $5 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x86\x80\x80\x80\x00\x01\x70\x01\x01\x80\x02");

// table.wast:8
let $6 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x87\x80\x80\x80\x00\x01\x70\x01\x00\x80\x80\x04");

// table.wast:9
let $7 = instance("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x89\x80\x80\x80\x00\x01\x70\x01\x00\xff\xff\xff\xff\x0f");

// table.wast:11
// FIXME
// assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x87\x80\x80\x80\x00\x02\x70\x00\x00\x70\x00\x00");

// table.wast:12
// FIXME
// assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x02\x94\x80\x80\x80\x00\x01\x08\x73\x70\x65\x63\x74\x65\x73\x74\x05\x74\x61\x62\x6c\x65\x01\x70\x00\x00\x04\x84\x80\x80\x80\x00\x01\x70\x00\x00");

// table.wast:14
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x09\x86\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x00");

// table.wast:15
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x01\x84\x80\x80\x80\x00\x01\x60\x00\x00\x03\x82\x80\x80\x80\x00\x01\x00\x09\x87\x80\x80\x80\x00\x01\x00\x41\x00\x0b\x01\x00\x0a\x88\x80\x80\x80\x00\x01\x82\x80\x80\x80\x00\x00\x0b");

// table.wast:18
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x85\x80\x80\x80\x00\x01\x70\x01\x01\x00");

// table.wast:22
assert_invalid("\x00\x61\x73\x6d\x01\x00\x00\x00\x04\x89\x80\x80\x80\x00\x01\x70\x01\xff\xff\xff\xff\x0f\x00");

// table.wast:27
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// table.wast:31
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// table.wast:35
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// table.wast:43
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// table.wast:47
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");

// table.wast:51
assert_malformed("\x3c\x6d\x61\x6c\x66\x6f\x72\x6d\x65\x64\x20\x71\x75\x6f\x74\x65\x3e");
