#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import re


def cross_product(type, operations):
    results = []
    for t in type:
        for o in operations:
            results.append("{}.{}".format(t,o))
    return results

def get_input_output(cvop):
    io_type_re = re.search("([if][0-9]{2}).[a-z_]*([if][0-9]{2})(_[us]){0,1}", cvop)
    input_type = io_type_re.group(1)
    output_type = io_type_re.group(2)
    return (input_type, output_type)

def pair_operations(operations):
    results = []
    for operation1 in operations:
        (i1,o1) = get_input_output(operation1)
        for operation2 in operations:
            (i2,o2) = get_input_output(operation2)
            if ((i1==o2) and (i2==o1)):
                if [operation2, operation1] not in results:
                    results.append([operation1, operation2])
    return results

#                             Numeric Instructions                             #
ITYPE = ["i32","i64"]
FTYPE = ["f32", "f64"]

IUNOP = ["clz", "ctz", "popcnt"]
IBINOP = ["add", "sub", "mul", "div_s", "div_u", "rem_s", "rem_u", "and", "or", "xor", "shl", "shr_s", "shr_u", "rotl", "rotr"]
FUNOP = ["abs", "neg", "sqrt", "ceil", "floor", "trunc", "nearest"]
FBINOP = ["add", "sub", "mul", "div", "min", "max", "copysign"]
IRELOP = ["eq", "ne", "lt_s", "lt_u", "gt_s", "gt_u", "le_s", "le_u", "ge_s", "ge_u"]
FRELOP = ["eq", "ne", "lt", "gt", "le", "ge"]

UNOP = cross_product(ITYPE, IUNOP) \
     + cross_product(FTYPE, FUNOP) \
     + ["i32.extend8_s", "i32.extend16_s", "i64.extend8_s", "i64.extend16_s", "i64.extend32_s"]

BINOP = cross_product(ITYPE,IBINOP) \
      + cross_product(FTYPE, FBINOP)

RELOP = cross_product(ITYPE, IRELOP) \
      + cross_product(FTYPE, FRELOP)

CVTOP = ["i32.wrap_i64", "i64.extend_i32_s", "i64.extend_i32_u", "i32.trunc_f32_s", "i32.trunc_f32_u", "i32.trunc_f64_s", "i32.trunc_f64_u", "i64.trunc_f32_s", "i64.trunc_f32_u", "i64.trunc_f64_s", "i64.trunc_f64_u", "i32.trunc_sat_f32_s", "i32.trunc_sat_f32_u", "i32.trunc_sat_f64_s", "i32.trunc_sat_f64_u", "i64.trunc_sat_f32_s", "i64.trunc_sat_f32_u", "i64.trunc_sat_f64_s", "i64.trunc_sat_f64_u", "f32.demote_f64", "f64.promote_f32", "f32.convert_i32_s", "f32.convert_i32_u", "f32.convert_i64_s", "f32.convert_i64_u", "f64.convert_i32_s", "f64.convert_i32_u", "f64.convert_i64_s", "f64.convert_i64_u", "i32.reinterpret_f32", "i64.reinterpret_f64", "f32.reinterpret_i32", "f64.reinterpret_i64"]

PUNOP = pair_operations(CVTOP)

NOP = UNOP + BINOP + PUNOP
#                              Vector Instructions                              #

VSHAPE = ["v128"]
ISHAPE = ["i8x16", "i16x8", "i32x4", "i64x2"]
FSHAPE = ["f32x4", "f64x2"]
SHAPE = ISHAPE+FSHAPE

half = ["low", "high"]

VVUNOP = ["not"]
VVBINOP = ["and", "andnot", "or", "xor"]
VVVTERNOP = ["bitselect"]
VIRELOP = ["eq", "ne", "lt_s", "lt_u", "gt_s", "gt_u", "le_s", "le_u", "ge_s", "ge_u"]
VFRELOP = ["eq", "ne", "lt", "gt", "le", "ge"]
VIUNOP = ["abs","neg"]
VIBINOP = ["add", "sub"]
VIMINMAXOP = ["min_s", "min_u", "max_s", "max_u"]
VISATBINOP = ["add_sat_s", "add_sat_u", "sub_sat_s", "sub_sat_u"]
VISHITOP = ["shl", "shr_s", "shr_u"]
VFUNOP = ["abs", "neg", "sqrt", "ceil", "floor", "trunc", "nearest"]
VFBINOP = ["add", "sub", "mul", "div", "min", "max", "pmin", "pmax"]


VUNOP = cross_product(VSHAPE, VVUNOP) \
      + cross_product(ISHAPE, VIUNOP) \
      + cross_product(FSHAPE, VFUNOP) \
      + ["i8x16.popcnt"]

VBINOP = cross_product(VSHAPE, VVBINOP) \
       + cross_product(ISHAPE, VIBINOP) \
       + cross_product(FSHAPE, VFBINOP) \
       + cross_product(["i8x16","i16x8","i32x4"], VIMINMAXOP) \
       + cross_product(["i8x16","i16x8"], VISATBINOP) \
       + cross_product(["i16x8","i32x4","i64x2"],["mul"]) \
       + cross_product(["i8x16","i16x8"], ["avgr_u"]) \
       + ["i16x8.q15mulr_sat_s"]

VRELOP = cross_product(["i8x16", "i16x8", "i32x4"], VIRELOP) \
       + cross_product(["i64x2"], ["eq", "ne", "lt_s", "gt_s", "le_s", "ge_s"]) \
       + cross_product(FSHAPE, VFRELOP)

VOP = VUNOP + VBINOP + VRELOP

#                             Memory Instructions                              #

ALLOP = VOP + NOP
