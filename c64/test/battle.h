/* pick the Crystal Knight, walk out the South gate into Bogmire and
 * wander (bonking with fire) until something attacks */
#define U 0x01
#define D 0x02
#define L 0x04
#define R 0x08
#define F 0x10
#define WANDER(dir) 40, dir, 2, F, 6, 0, 2, F, 6, 0
static const unsigned char autoplay[] = {
    30, 0, 2, D, 10, 0, 2, F, 60, 0,
    85, D,                      /* down to the bottom of the village */
    75, R,                      /* east to the South gate column */
    20, D, 60, 0,               /* through the gate */
    WANDER(D), WANDER(L), WANDER(D), WANDER(R), WANDER(D), WANDER(R),
    WANDER(D), WANDER(L), WANDER(D), WANDER(R), WANDER(U), WANDER(D),
    0
};
