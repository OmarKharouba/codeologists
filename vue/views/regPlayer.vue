<template>

  <form method="POST" action = "/newPlayer" enctype="multipart/form-data">
		<input type="text" name="name">
		<input type="text" name="username">
		<input type="password" name="password">
		<input type="text" name="email">
		<input type="text" name="phone_number">
		<input type="text" name="location">
		<input type="file" name="profile_pic">
		<input type="date" name="birthdate">


		<input type="submit" name="submit" value="Register">
	</form>


</template>
