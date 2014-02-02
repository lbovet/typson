module MyModule {
    export interface Def {
        nest: Def;
        prev: MyModule.Def;
        propA: SubModule.HelperA;
        propB: SubModule.HelperB;
    }
    export module SubModule {
        export interface HelperA {
            propA: number;
            propB: number;
        }
        export interface HelperB {
            propA: number;
            propB: number;
        }
    }
}
