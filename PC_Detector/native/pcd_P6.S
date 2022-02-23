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
#include "pcd_P0.h"

.text

.global spam_port0
.p2align 4
spam_port0:
lfence
loop:
jmp loop
lfence
ret
