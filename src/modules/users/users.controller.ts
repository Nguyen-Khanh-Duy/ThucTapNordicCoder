import { Public } from '@/decorator/customize';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common'; // Added @Query import
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @Public()
  async findAll(
    @Query() query: string,           // Extract query params
    @Query('current') current: string, // Extract 'current' query param
    @Query('pageSize') pageSize: string // Extract 'pageSize' query param
  ) {
    return this.usersService.findAll(query, +current, +pageSize); // Pass values to the service
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);  // Convert 'id' to number before passing to service
  }

  @Patch()
  update( @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(updateUserDto);  // Convert 'id' to number before passing to service
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);  // Convert 'id' to number before passing to service
  }
}
