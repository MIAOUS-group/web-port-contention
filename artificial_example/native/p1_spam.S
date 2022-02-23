/** This code is inspired by the code of Alday et al from https://github.com/bbbrumley/portsmash
*
*   Copyright 2018-2019 Alejandro Cabrera Aldaya, Billy Bob Brumley, Sohaib ul Hassan, Cesar Pereida García and Nicola Tuveri
*
*   Licensed under the Apache License, Version 2.0 (the "License");
*   you may not use this file except in compliance with the License.
*   You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
*   Unless required by applicable law or agreed to in writing, software
*   distributed under the License is distributed on an "AS IS" BASIS,
*   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
*   See the License for the specific language governing permissions and
*   limitations under the License.
**/
#include "p1_spam.h"

.text

.global spam_port1
.p2align 4
spam_port1:
mov $SPY_NUM_TIMINGS, %rcx
1:
lfence
.rept 48
popcnt %r8, %r8
popcnt %r9, %r9
popcnt %r10, %r10

.endr
lfence
dec %rcx
jnz 1b
ret
