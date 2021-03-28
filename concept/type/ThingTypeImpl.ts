/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {GraknTransaction} from "../../api/GraknTransaction";
import {Thing} from "../../api/concept/thing/Thing";
import {RoleType} from "../../api/concept/type/RoleType";
import {AttributeType} from "../../api/concept/type/AttributeType";
import {RemoteThingType, ThingType} from "../../api/concept/type/ThingType";
import {TypeImpl} from "./TypeImpl";
import {ThingImpl} from "../thing/ThingImpl";
import {RoleTypeImpl} from "./RoleTypeImpl";
import {EntityTypeImpl} from "./EntityTypeImpl";
import {RelationTypeImpl} from "./RelationTypeImpl";
import {AttributeTypeImpl} from "./AttributeTypeImpl";
import {Label} from "../../common/Label";
import {Core} from "../../common/rpc/RequestBuilder";
import {Stream} from "../../common/util/Stream";
import {ErrorMessage} from "../../common/errors/ErrorMessage";
import {GraknClientError} from "../../common/errors/GraknClientError";
import {Type as TypeProto} from "grakn-protocol/common/concept_pb";
import {ConceptProtoBuilder} from "../../concept_old/proto/ConceptProtoBuilder";
import BAD_ENCODING = ErrorMessage.Concept.BAD_ENCODING;

export class ThingTypeImpl extends TypeImpl implements ThingType {

    constructor(name: string, isRoot: boolean) {
        super(Label.of(name), isRoot);
    }

    asRemote(transaction: GraknTransaction): RemoteThingType {
        return new ThingTypeImpl.RemoteImpl((transaction as GraknTransaction.Extended), this.getLabel(), this.isRoot());
    }

    isThingType(): boolean {
        return true;
    }

}

export namespace ThingTypeImpl {



    export function of(thingTypeProto: TypeProto) {
        switch (thingTypeProto.getEncoding()) {
            case TypeProto.Encoding.ENTITY_TYPE:
                return EntityTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.RELATION_TYPE:
                return RelationTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.ATTRIBUTE_TYPE:
                return AttributeTypeImpl.of(thingTypeProto);
            case TypeProto.Encoding.THING_TYPE:
                return new ThingTypeImpl(thingTypeProto.getLabel(), thingTypeProto.getRoot());
            default:
                throw new GraknClientError(BAD_ENCODING.message(thingTypeProto.getEncoding()));
        }
    }

    export class RemoteImpl extends TypeImpl.RemoteImpl implements RemoteThingType {

        constructor(transaction: GraknTransaction.Extended, label: Label, isRoot: boolean) {
            super(transaction, label, isRoot);
        }


        asRemote(transaction: GraknTransaction): RemoteThingType {
            return this;
        }

        isThingType(): boolean {
            return true;
        }

        getSupertype(): Promise<ThingType> {
            return super.getSupertype() as Promise<ThingType>;
        }

        getSupertypes(): Stream<ThingType> {
            return super.getSupertypes() as Stream<ThingType>;
        }

        getSubtypes(): Stream<ThingType> {
            return super.getSubtypes() as Stream<ThingType>;
        }

        getInstances(): Stream<Thing> {
            const request = Core.Type.ThingType.getInstancesReq(this.getLabel());
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetInstancesResPart().getThingsList()))
                .map((thingProto) => ThingImpl.of(thingProto));
        }

        getOwns(): Stream<AttributeType>;
        getOwns(valueType: AttributeType.ValueType): Stream<AttributeType>;
        getOwns(keysOnly: boolean): Stream<AttributeType>;
        getOwns(valueType: AttributeType.ValueType, keysOnly: boolean): Stream<AttributeType>;
        getOwns(valueTypeOrKeysOnly?: AttributeType.ValueType | boolean, keysOnly?: boolean): Stream<AttributeType> {
            let request;
            if (!valueTypeOrKeysOnly) {
                request = Core.Type.ThingType.getOwnsReq(this.getLabel(), false);
            } else if (typeof valueTypeOrKeysOnly === "boolean") {
                request = Core.Type.ThingType.getOwnsReq(this.getLabel(), valueTypeOrKeysOnly as boolean)
            } else if (!keysOnly) {
                request = Core.Type.ThingType.getOwnsByTypeReq(
                    this.getLabel(), (valueTypeOrKeysOnly as AttributeType.ValueType).proto(), false
                );
            } else {
                request = Core.Type.ThingType.getOwnsByTypeReq(
                    this.getLabel(), (valueTypeOrKeysOnly as AttributeType.ValueType).proto(), keysOnly
                );
            }
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetOwnsResPart().getAttributeTypesList()))
                .map((attributeTypeProto) => AttributeTypeImpl.of(attributeTypeProto));
        }

        async setOwns(attributeType: AttributeType): Promise<void>;
        async setOwns(attributeType: AttributeType, isKey: boolean): Promise<void>;
        async setOwns(attributeType: AttributeType, overriddenType: AttributeType): Promise<void>;
        async setOwns(attributeType: AttributeType, overriddenTypeOrIsKey?: AttributeType | boolean, isKey?: boolean): Promise<void> {
            let request;
            if (!overriddenTypeOrIsKey) {
                request = Core.Type.ThingType.setOwnsReq(this.getLabel(), ThingType.proto(attributeType), false);
            } else if (typeof overriddenTypeOrIsKey === "boolean") {
                request = Core.Type.ThingType.setOwnsReq(this.getLabel(), ThingType.proto(attributeType), overriddenTypeOrIsKey as boolean)
            } else if (!isKey) {
                request = Core.Type.ThingType.setOwnsReq(
                    this.getLabel(), ThingType.proto((overriddenTypeOrIsKey as AttributeType)), false
                );
            } else {
                request = Core.Type.ThingType.setOwnsReq(
                    this.getLabel(), ThingType.proto(overriddenTypeOrIsKey as AttributeType), isKey
                );
            }
            await this.execute(request);
        }

        async unsetOwns(attributeType: AttributeType): Promise<void> {
            const request = Core.Type.ThingType.unsetOwnsReq(this.getLabel(), ThingType.proto(attributeType));
            await this.execute(request);
        }

        getPlays(): Stream<RoleType> {
            const request = Core.Type.ThingType.getPlaysReq(this.getLabel());
            return this.stream(request)
                .flatMap((resPart) => Stream.array(resPart.getThingTypeGetPlaysResPart().getRolesList()))
                .map((roleProto) => RoleTypeImpl.of(roleProto));
        }

        async setPlays(role: RoleType): Promise<void>;
        async setPlays(role: RoleType, overriddenType?: RoleType): Promise<void> {
            let request;
            if (!overriddenType) {
                request = Core.Type.ThingType.setPlaysReq(this.getLabel(), RoleType.proto(role));
            } else {
                request = Core.Type.ThingType.setPlaysOverriddenReq(this.getLabel(), RoleType.proto(role), RoleType.proto(overriddenType));
            }
            await this.execute(request);
        }

        async unsetPlays(role: RoleType): Promise<void> {
            const request = Core.Type.ThingType.unsetPlaysReq(this.getLabel(), RoleType.proto(role));
            await this.execute(request);
        }

        async setAbstract(): Promise<void> {
            const request = Core.Type.ThingType.setAbstractReq(this.getLabel());
            await this.execute(request);
        }

        async unsetAbstract(): Promise<void> {
            const request = Core.Type.ThingType.unsetAbstractReq(this.getLabel());
            await this.execute(request);
        }

        async isDeleted(): Promise<boolean> {
            return (await this._transaction.concepts().getThingType(this.getLabel().name())) != null;
        }

        protected async setSupertype(thingType: ThingType): Promise<void> {
            const request = Core.Type.ThingType.setSupertypeReq(this.getLabel(), ThingType.proto(thingType));
            await this.execute(request);
        }

    }

}