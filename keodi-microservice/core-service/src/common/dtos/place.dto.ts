import { IsNotEmpty, IsNumber } from "class-validator";
import { PaginationQueryDto } from "./pagination.dto";

export class NearMeDto extends PaginationQueryDto {
    @IsNotEmpty()
    @IsNumber()
    latitude: number;

    @IsNotEmpty()
    @IsNumber()
    longitude: number;

    @IsNotEmpty()
    @IsNumber()
    radius: number;

    @IsNotEmpty()
    userId: string;
}
